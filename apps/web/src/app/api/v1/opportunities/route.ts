import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    await ensureSchema(db);

    const { searchParams } = new URL(req.url);
    const recFilter = searchParams.get('recommendation') || '';
    const mpFilter  = searchParams.get('marketplace') || '';

    const clauses: string[] = [];
    const args: string[] = [];
    if (recFilter) { clauses.push('o.recommendation = ?'); args.push(recFilter); }
    if (mpFilter)  { clauses.push('m.code = ?');           args.push(mpFilter); }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

    const result = await db.execute({
      sql: `
        SELECT
          o.id, o.status, o.recommendation, o.confidence, o.createdAt as oCreatedAt,
          p.id as pId, p.title as pTitle, p.category as pCategory, p.imageUrl as pImageUrl,
          m.id as mId, m.code as mCode, m.country as mCountry, m.currency as mCurrency,
          s.opportunity as sOpp, s.demand as sDemand, s.competition as sComp,
          s.margin as sMargin, s.trend as sTrend, s.shipping as sShipping, s.saturation as sSat,
          pm.productCostMinor as pmSrc, pm.salePriceMinor as pmSale,
          pm.landedCostMinor as pmLanded, pm.marketplaceFeesMinor as pmFees,
          pm.grossProfitMinor as pmGross, pm.netProfitMinor as pmNet,
          pm.netMarginPct as pmMargin, pm.roiPct as pmRoi, pm.currency as pmCurrency
        FROM "Opportunity" o
        LEFT JOIN "Product" p      ON o.productId      = p.id
        LEFT JOIN "Marketplace" m  ON o.marketplaceId  = m.id
        LEFT JOIN "Score" s        ON o.id             = s.opportunityId
        LEFT JOIN "ProfitModel" pm ON o.id             = pm.opportunityId
        ${where}
        ORDER BY s.opportunity DESC, o.createdAt DESC
        LIMIT 200
      `,
      args,
    });

    const oppIds = result.rows.map(r => r.id as string).filter(Boolean);

    // Fetch sourcing candidates (supplier prices) for all opportunities in one query
    let suppliersMap: Record<string, any[]> = {};
    if (oppIds.length > 0) {
      try {
        const candResult = await db.execute({
          sql: `SELECT opportunityId, supplierName, source, sourceUrl, productCostMinor, moq, leadTimeDays, feasibility FROM "SourcingCandidate" WHERE opportunityId IN (${oppIds.map(() => '?').join(',')}) ORDER BY productCostMinor ASC`,
          args: oppIds,
        });
        for (const c of candResult.rows) {
          const oid = c.opportunityId as string;
          if (!suppliersMap[oid]) suppliersMap[oid] = [];
          suppliersMap[oid].push({
            name:        c.supplierName,
            source:      c.source,
            url:         c.sourceUrl,
            costMinor:   Number(c.productCostMinor ?? 0),
            moq:         Number(c.moq ?? 0),
            leadDays:    Number(c.leadTimeDays ?? 0),
            feasibility: c.feasibility,
          });
        }
      } catch { /* SourcingCandidate table may not exist yet */ }
    }

    const rows = result.rows.map(r => {
      const src     = Number(r.pmSrc    ?? 0);
      const sale    = Number(r.pmSale   ?? 0);
      const landed  = Number(r.pmLanded ?? 0);
      const fees    = Number(r.pmFees   ?? 0);
      const net     = Number(r.pmNet    ?? 0);
      const overhead = Math.max(0, landed - src);
      const storedUrl = (r.pImageUrl as string) || '';
      const imageUrl = storedUrl || (() => {
        const raw = (String(r.pTitle || r.pCategory || 'product')).toLowerCase().replace(/[^a-z\s]/g, '');
        const keywords = raw.split(/\s+/).filter((w: string) => w.length > 2 && !['and','the','for','with','set'].includes(w)).slice(0, 3).join(',') || 'product';
        const lock = parseInt(String(r.pId).replace(/-/g, '').slice(0, 8), 16) % 10000;
        return `https://loremflickr.com/400/300/${encodeURIComponent(keywords)}/all?lock=${lock}`;
      })();

      const currency = (r.pmCurrency ?? r.mCurrency ?? 'USD') as string;

      // Marketplace-specific fee schedule approximations
      const mpCode = (r.mCode ?? '') as string;
      const referralPct = mpCode.startsWith('etsy') ? 6.5 : mpCode.startsWith('temu') ? 8 : mpCode.startsWith('walmart') ? 8 : 15;
      const referralFee = Math.round(sale * referralPct / 100);
      const fbaFee      = Math.round(fees - referralFee > 0 ? fees - referralFee : fees * 0.5);
      const adSpend     = Math.round(sale * 0.05);

      return {
        id: r.id, status: r.status, recommendation: r.recommendation,
        confidence: r.confidence, createdAt: r.oCreatedAt,
        product: { id: r.pId, title: r.pTitle, category: r.pCategory, imageUrl },
        marketplace: { id: r.mId, code: r.mCode, country: r.mCountry, currency: r.mCurrency },
        score: r.sOpp != null ? {
          opportunity: r.sOpp, demand: r.sDemand, competition: r.sComp,
          margin: r.sMargin, trend: r.sTrend, shipping: r.sShipping, saturation: r.sSat,
        } : null,
        profitModel: r.pmNet != null ? {
          currency,
          productCostMinor:     src,
          salePriceMinor:       sale,
          landedCostMinor:      landed,
          marketplaceFeesMinor: fees,
          grossProfitMinor:     Number(r.pmGross ?? 0),
          netProfitMinor:       net,
          netMarginPct:         Number(r.pmMargin ?? 0),
          roiPct:               Number(r.pmRoi ?? 0),
          // Landed cost breakdown
          intlShippingMinor:    Math.round(overhead * 0.60),
          packagingCostMinor:   Math.round(overhead * 0.25),
          dutyMinor:            Math.round(overhead * 0.15),
          // Fee breakdown (marketplace-specific)
          referralFeeMinor:     referralFee,
          fbaFeeMinor:          fbaFee,
          referralPct,
          adCostMinor:          adSpend,
          // Totals including ads
          totalCostMinor:       landed + fees + adSpend,
          trueNetMinor:         sale - landed - fees - adSpend,
          // Projections (assuming 50 units/month initial)
          breakevenUnits:       net > 0 ? Math.ceil(50000 / net) : 999,
          monthlyProfitMinor:   net * 50,
          annualProfitMinor:    net * 600,
        } : null,
        suppliers: suppliersMap[r.id as string] ?? [],
      };
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('Opportunities GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
