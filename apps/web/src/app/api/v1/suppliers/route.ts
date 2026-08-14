import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `
        SELECT
          sc.id, sc.opportunityId, sc.supplierName, sc.source, sc.sourceUrl,
          sc.productCostMinor, sc.moq, sc.leadTimeDays, sc.feasibility,
          p.id as pId, p.title as pTitle, p.category as pCategory,
          m.code as mCode, m.country as mCountry, m.currency as mCurrency,
          o.recommendation, o.confidence
        FROM "SourcingCandidate" sc
        LEFT JOIN "Opportunity" o  ON sc.opportunityId = o.id
        LEFT JOIN "Product" p      ON o.productId       = p.id
        LEFT JOIN "Marketplace" m  ON o.marketplaceId   = m.id
        ORDER BY sc.productCostMinor ASC
        LIMIT 500
      `,
      args: [],
    });

    const rows = r.rows.map(s => ({
      id:              s.id,
      opportunityId:   s.opportunityId,
      supplierName:    s.supplierName,
      source:          s.source,
      sourceUrl:       s.sourceUrl,
      productCostMinor: s.productCostMinor,
      moq:             s.moq,
      leadTimeDays:    s.leadTimeDays,
      feasibility:     s.feasibility,
      supplier: {
        name:      s.supplierName,
        source:    s.source,
        sourceUrl: s.sourceUrl,
      },
      opp: {
        id:             s.opportunityId,
        recommendation: s.recommendation,
        confidence:     s.confidence,
        product:        { id: s.pId, title: s.pTitle, category: s.pCategory },
        marketplace:    { code: s.mCode, country: s.mCountry, currency: s.mCurrency },
      },
    }));

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('Suppliers GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
