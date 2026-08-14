import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `
        SELECT o.id, o.status, o.recommendation, o.confidence,
          p.id as pId, p.title as pTitle, p.category as pCategory,
          p.imageUrl as pImageUrl, p.description as pDesc,
          m.id as mId, m.code as mCode, m.country as mCountry, m.currency as mCurrency,
          s.opportunity as sOpp, s.demand as sDemand, s.competition as sComp,
          s.margin as sMargin, s.trend as sTrend, s.shipping as sShipping,
          s.marketplaceFit as sMktFit, s.saturation as sSat,
          s.scoreVersion as sVersion,
          pm.sourcePriceMinor, pm.salePriceMinor, pm.landedCostMinor,
          pm.marketplaceFeeMinor, pm.netProfitMinor, pm.netMarginPct, pm.roi, pm.currency as pmCurrency
        FROM "Opportunity" o
        LEFT JOIN "Product" p ON o.productId = p.id
        LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
        LEFT JOIN "Score" s ON o.id = s.opportunityId
        LEFT JOIN "ProfitModel" pm ON o.id = pm.opportunityId
        WHERE o.id = ?
        LIMIT 1
      `,
      args: [params.id],
    });

    const row = r.rows[0];
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Sourcing candidates
    const sc = await db.execute({
      sql: `SELECT * FROM "SourcingCandidate" WHERE opportunityId = ? ORDER BY productCostMinor ASC`,
      args: [params.id],
    });

    return NextResponse.json({
      id: row.id,
      status: row.status,
      recommendation: row.recommendation,
      confidence: row.confidence,
      scoreVersion: row.sVersion ?? '2.0.0',
      product: {
        id: row.pId, title: row.pTitle, category: row.pCategory,
        imageUrl: row.pImageUrl, description: row.pDesc,
      },
      marketplace: {
        id: row.mId, code: row.mCode, country: row.mCountry, currency: row.mCurrency,
      },
      score: row.sOpp != null ? {
        opportunity: row.sOpp, demand: row.sDemand, competition: row.sComp,
        margin: row.sMargin, trend: row.sTrend, shipping: row.sShipping,
        marketplaceFit: row.sMktFit, saturation: row.sSat,
      } : null,
      profitModel: row.netProfitMinor != null ? {
        sourcePriceMinor: row.sourcePriceMinor, salePriceMinor: row.salePriceMinor,
        landedCostMinor: row.landedCostMinor, marketplaceFeeMinor: row.marketplaceFeeMinor,
        netProfitMinor: row.netProfitMinor, netMarginPct: row.netMarginPct,
        roi: row.roi, currency: row.pmCurrency,
      } : null,
      sourcingCandidates: sc.rows.map(s => ({
        id: s.id, supplierName: s.supplierName, source: s.source, sourceUrl: s.sourceUrl,
        productCostMinor: s.productCostMinor, moq: s.moq, leadTimeDays: s.leadTimeDays,
        feasibility: s.feasibility,
        supplier: { name: s.supplierName, source: s.source, sourceUrl: s.sourceUrl },
      })),
    });
  } catch (err: any) {
    console.error('Opportunity GET [id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
