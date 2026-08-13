import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    await ensureSchema(db);

    const result = await db.execute(`
      SELECT o.*,
        p.id as pId, p.title as pTitle, p.category as pCategory, p.imageUrl as pImageUrl,
        m.id as mId, m.code as mCode, m.country as mCountry, m.currency as mCurrency,
        s.opportunity as sOpportunity, s.demand as sDemand, s.competition as sCompetition,
        s.margin as sMargin, s.trend as sTrend, s.shipping as sShipping,
        pm.netProfitMinor as pmNetProfit, pm.netMarginPct as pmNetMargin
      FROM "Opportunity" o
      LEFT JOIN "Product" p ON o.productId = p.id
      LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
      LEFT JOIN "Score" s ON o.id = s.opportunityId
      LEFT JOIN "ProfitModel" pm ON o.id = pm.opportunityId
      ORDER BY s.opportunity DESC, o.createdAt DESC
    `);
    const rows = result.rows.map(r => ({
      id: r.id, status: r.status, recommendation: r.recommendation, confidence: r.confidence,
      product: { id: r.pId, title: r.pTitle, category: r.pCategory, imageUrl: r.pImageUrl },
      marketplace: { id: r.mId, code: r.mCode, country: r.mCountry, currency: r.mCurrency },
      score: r.sOpportunity != null ? { opportunity: r.sOpportunity, demand: r.sDemand, competition: r.sCompetition, margin: r.sMargin, trend: r.sTrend, shipping: r.sShipping } : null,
      profitModel: r.pmNetProfit != null ? { netProfitMinor: r.pmNetProfit, netMarginPct: r.pmNetMargin } : null,
    }));
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('Opportunities GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
