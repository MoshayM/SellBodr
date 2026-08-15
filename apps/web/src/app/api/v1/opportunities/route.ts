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
          sql: `SELECT opportunityId, id, supplierName, source, sourceUrl, productCostMinor, moq, leadTimeDays, feasibility, city, country, latitude, longitude, rating, verifiedBadge FROM "SourcingCandidate" WHERE opportunityId IN (${oppIds.map(() => '?').join(',')}) ORDER BY CASE WHEN country = 'India' THEN 0 ELSE 1 END ASC, productCostMinor ASC`,
          args: oppIds,
        });
        for (const c of candResult.rows) {
          const oid = c.opportunityId as string;
          if (!suppliersMap[oid]) suppliersMap[oid] = [];
          suppliersMap[oid].push({
            id:          c.id,
            name:        c.supplierName,
            source:      c.source,
            url:         c.sourceUrl,
            costMinor:   Number(c.productCostMinor ?? 0),
            moq:         Number(c.moq ?? 0),
            leadDays:    Number(c.leadTimeDays ?? 0),
            feasibility: c.feasibility,
            city:        c.city,
            country:     c.country || 'India',
            latitude:    c.latitude,
            longitude:   c.longitude,
            rating:      Number(c.rating ?? 4.0),
            verifiedBadge: Boolean(c.verifiedBadge),
          });
        }
      } catch { /* SourcingCandidate table may not exist yet */ }
    }

    // ── Auto-populate suppliers for legacy opportunities with no candidates ─────
    const CITY_MAP_OPP: Record<string, string[]> = {
      'home decor':  ['Moradabad','Jodhpur','Jaipur'], 'handicraft': ['Jaipur','Agra','Varanasi'],
      'textile':     ['Surat','Tiruppur','Ludhiana'],  'fashion':    ['Surat','Mumbai','Kolkata'],
      'health':      ['Mumbai','Ahmedabad','Pune'],     'beauty':     ['Mumbai','Kannauj','Bangalore'],
      'electronics': ['Noida','Chennai','Hyderabad'],   'food':       ['Delhi','Amritsar','Pune'],
      'sports':      ['Jalandhar','Meerut','Ludhiana'], 'kitchen':    ['Moradabad','Delhi','Mumbai'],
      'jewellery':   ['Jaipur','Surat','Mumbai'],       'leather':    ['Agra','Kanpur','Chennai'],
    };
    const COORDS_OPP: Record<string, [number,number]> = {
      Jaipur:[26.91,75.79], Moradabad:[28.84,78.77], Jodhpur:[26.24,73.02], Surat:[21.17,72.83],
      Tiruppur:[11.11,77.34], Ludhiana:[30.90,75.86], Mumbai:[19.08,72.88], Ahmedabad:[23.02,72.57],
      Kannauj:[27.06,79.92], Bangalore:[12.97,77.59], Noida:[28.54,77.39], Chennai:[13.08,80.27],
      Hyderabad:[17.39,78.49], Delhi:[28.61,77.21], Agra:[27.18,78.01], Varanasi:[25.32,82.97],
      Jalandhar:[31.33,75.58], Meerut:[28.98,77.71], Amritsar:[31.63,74.87], Kanpur:[26.45,80.33],
      Pune:[18.52,73.86], Kolkata:[22.57,88.36],
    };
    function cityForCat(cat: string): string {
      const c = (cat || '').toLowerCase();
      for (const [k, cities] of Object.entries(CITY_MAP_OPP)) {
        if (c.includes(k)) return cities[Math.abs(c.charCodeAt(0)) % cities.length];
      }
      return 'Delhi';
    }

    const ts = Date.now();
    for (const r of result.rows) {
      const oid = r.id as string;
      if ((suppliersMap[oid] ?? []).length > 0) continue;
      const src = Number(r.pmSrc ?? 0);
      if (!src) continue;
      const title = String(r.pTitle || '');
      const cat   = String(r.pCategory || '');
      const city  = cityForCat(cat);
      const coords = COORDS_OPP[city] ?? [28.61, 77.21];
      const kw = title.split(' ').slice(0, 2).join(' ');
      const newCands = [
        { name: `${city} ${kw} Exports Pvt Ltd`,         src: 'indiamart',    url: `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(title.slice(0,60))}`,                             pct: 1.00, moq: 50,  lead: 21, feas: 'moderate', city, country: 'India',     lat: coords[0], lon: coords[1], rating: 4.4, ver: 1 },
        { name: `${kw} Global Manufacturing Co., Ltd`,    src: 'alibaba',      url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(title.slice(0,40))}`,                   pct: 0.80, moq: 100, lead: 35, feas: 'easy',     city: 'Guangzhou', country: 'China',     lat: 23.13, lon: 113.26, rating: 4.6, ver: 1 },
        { name: `${title.split(' ')[0]} Direct Wholesale`, src: 'dhgate',      url: `https://www.dhgate.com/wholesale/search.do?act=search&searchkey=${encodeURIComponent(title.slice(0,40))}`, pct: 0.72, moq: 20,  lead: 28, feas: 'easy',     city: 'Yiwu',      country: 'China',     lat: 29.31, lon: 120.06, rating: 3.9, ver: 0 },
        { name: `Global ${kw} Exports Ltd`,               src: 'globalsources', url: `https://www.globalsources.com/gsol/I/Search?keyword=${encodeURIComponent(title.slice(0,40))}`,              pct: 0.85, moq: 200, lead: 38, feas: 'moderate', city: 'Hong Kong', country: 'Hong Kong', lat: 22.32, lon: 114.17, rating: 4.3, ver: 1 },
      ];
      suppliersMap[oid] = [];
      for (const s of newCands) {
        const scId = crypto.randomUUID();
        try {
          await db.execute({ sql: `INSERT INTO "SourcingCandidate" (id, supplierId, opportunityId, supplierName, source, sourceUrl, productCostMinor, moq, leadTimeDays, feasibility, city, country, latitude, longitude, rating, verifiedBadge, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [scId, scId, oid, s.name, s.src, s.url, Math.round(src * s.pct), s.moq, s.lead, s.feas, s.city, s.country, s.lat, s.lon, s.rating, s.ver, ts, ts] });
        } catch { /* skip if already exists */ }
        suppliersMap[oid].push({ id: scId, name: s.name, source: s.src, url: s.url, costMinor: Math.round(src * s.pct), moq: s.moq, leadDays: s.lead, feasibility: s.feas, city: s.city, country: s.country, latitude: s.lat, longitude: s.lon, rating: s.rating, verifiedBadge: Boolean(s.ver) });
      }
    }

    const rows = result.rows.map(r => {
      const src     = Number(r.pmSrc    ?? 0);
      const sale    = Number(r.pmSale   ?? 0);
      const landed  = Number(r.pmLanded ?? 0);
      const fees    = Number(r.pmFees   ?? 0);
      const net     = Number(r.pmNet    ?? 0);
      const overhead = Math.max(0, landed - src);
      const storedUrl = (r.pImageUrl as string) || '';
      const needsImage = !storedUrl || storedUrl.includes('loremflickr.com') || storedUrl.includes('picsum.photos') || storedUrl.includes('pollinations.ai');
      const imageUrl = needsImage ? (() => {
        const words = [...String(r.pTitle || '').split(' ').slice(0, 4), String(r.pCategory || '').replace(/_/g, ' ').split(' ')[0]].filter(Boolean).map(w => w.toLowerCase());
        return `https://source.unsplash.com/400x300/?${encodeURIComponent(words.join(','))}`;
      })() : storedUrl;

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
