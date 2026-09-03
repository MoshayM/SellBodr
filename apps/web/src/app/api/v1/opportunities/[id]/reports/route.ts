import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { checkAndDeductCredit } from '@/lib/credits';
import { PROVIDERS, FREE_PROVIDER_IDS, tryProvider } from '@/lib/ai/gateway';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

function staticReport(title: string, category: string, mkt: string, rec: string, scores: any) {
  const cat = category.replace(/_/g, ' ') || 'product';
  return {
    executive_summary: `${title} represents a ${rec === 'launch' ? 'strong' : rec === 'hold' ? 'moderate' : 'low'} cross-border eCommerce opportunity on ${mkt}. The product scores ${scores.opportunity ?? 0}/100 on the SellBodr Opportunity Index, driven primarily by ${scores.demand >= 60 ? 'strong demand signals' : 'moderate demand'} and ${scores.margin >= 60 ? 'healthy margin potential' : 'competitive margin dynamics'}.`,
    market_opportunity: `The ${cat} category on ${mkt} shows ${scores.trend >= 70 ? 'strong upward momentum' : scores.trend >= 50 ? 'stable trends' : 'softening trends'}. Competition score of ${scores.competition ?? 0}/100 (higher = less competition) indicates ${scores.competition >= 70 ? 'a relatively open market with room for new entrants' : scores.competition >= 50 ? 'moderate competitive pressure' : 'a highly competitive landscape that requires strong differentiation'}.`,
    sourcing_advantage: `India-sourced ${cat} products benefit from lower manufacturing costs, skilled artisan labour, and established export infrastructure. Estimated landed cost advantage of 35–55% vs. Western-manufactured alternatives. Shipping score of ${scores.shipping ?? 0}/100 reflects ${scores.shipping >= 70 ? 'favourable logistics routes' : 'manageable but cost-sensitive logistics'}.`,
    financial_projection: `Based on category benchmarks, projected net margin of ${scores.margin >= 70 ? '35–45%' : scores.margin >= 50 ? '25–35%' : '15–25%'} after marketplace fees, FBA/fulfillment, advertising, and landed cost. Break-even estimated at 80–120 units sold. Recommended launch price: research local market 10–15% below top 3 competitors.`,
    risk_factors: `Key risks: ${scores.saturation < 50 ? 'High category saturation — differentiation through branding and A+ content is critical. ' : ''}${scores.shipping < 50 ? "Shipping complexity from India to this market — consider 3PL or Amazon's partnered carrier program. " : ''}${scores.competition < 40 ? 'Strong incumbent sellers — focus on a product variation (size, colour, bundle) not directly competing on the same ASIN. ' : ''}Currency fluctuation risk for INR/USD; consider forward contracts for large purchase orders.`,
    recommended_actions: `1. Validate demand with a small test order (50–100 units). 2. Create a differentiated product listing with professional photography and A+ content. 3. Launch PPC with $10–15/day budget targeting 20–30 exact-match keywords. 4. Build to 25+ reviews within 60 days — this is the conversion inflection point. 5. ${rec === 'launch' ? 'Move quickly — this is a LAUNCH opportunity with strong fundamentals.' : rec === 'hold' ? 'Proceed cautiously — monitor competitor pricing before scaling inventory.' : 'Consider pivoting to a variation of this product in a less saturated sub-category.'}`,
    verdict: rec.toUpperCase(),
    score: scores.opportunity ?? 0,
    generatedAt: new Date().toISOString(),
  };
}

// GET /api/v1/opportunities/:id/reports — returns all generations, newest first
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await ensureSchema(db);
    const r = await db.execute({
      sql: `SELECT id, content, createdAt FROM "OpportunityReport" WHERE opportunityId = ? ORDER BY createdAt DESC`,
      args: [params.id],
    });
    const rows = r.rows.map((row: any) => ({
      id: String(row.id),
      createdAt: Number(row.createdAt),
      ...JSON.parse(String(row.content || '{}')),
    }));
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/v1/opportunities/:id/reports — generates a new report and prepends it to history
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let freeOnly = true;
  let isAdminUser = false;
  let userId = '';
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (token) {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      isAdminUser = payload.role === 'admin';
      freeOnly    = !isAdminUser && payload.plan !== 'pro';
      if (!isAdminUser) userId = String(payload.sub ?? '');
    } catch { /* treat as free guest */ }
  }

  if (!isAdminUser && !userId) {
    return NextResponse.json({ error: 'Sign in to generate reports', code: 'auth_required' }, { status: 401 });
  }

  try {
    const db = getDb();
    await ensureSchema(db);

    // Credit gate — admins bypass
    if (!isAdminUser) {
      const cr = await checkAndDeductCredit(userId, 'report', db);
      if (!cr.ok) {
        return NextResponse.json(
          { error: 'No credits remaining. Buy 10 reports for $5.', code: 'no_credits' },
          { status: 402 },
        );
      }
    }

    const r = await db.execute({
      sql: `SELECT o.recommendation, p.title, p.category, m.code as mCode, m.country as mCountry,
              s.opportunity, s.demand, s.competition, s.margin, s.trend, s.shipping, s.saturation
            FROM "Opportunity" o
            LEFT JOIN "Product" p ON o.productId = p.id
            LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
            LEFT JOIN "Score" s ON s.opportunityId = o.id
            WHERE o.id = ?`,
      args: [params.id],
    });
    if (!r.rows.length) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const opp = r.rows[0] as any;

    const title    = String(opp.title    || '');
    const category = String(opp.category || '').replace(/_/g, ' ');
    const mkt      = String(opp.mCode    || '').replace(/_/g, ' ').toUpperCase();
    const country  = String(opp.mCountry || '').toUpperCase();
    const rec      = String(opp.recommendation || 'hold');
    const scores   = {
      opportunity:  Math.round(Number(opp.opportunity  ?? 0)),
      demand:       Math.round(Number(opp.demand       ?? 0)),
      competition:  Math.round(Number(opp.competition  ?? 0)),
      margin:       Math.round(Number(opp.margin       ?? 0)),
      trend:        Math.round(Number(opp.trend        ?? 0)),
      shipping:     Math.round(Number(opp.shipping     ?? 0)),
      saturation:   Math.round(Number(opp.saturation   ?? 0)),
    };

    const available = PROVIDERS.filter(p =>
      p.available() && (!freeOnly || (FREE_PROVIDER_IDS as readonly string[]).includes(p.id))
    );

    let content: any = null;
    if (available.length) {
      const best = available.sort((a, b) => b.quality - a.quality)[0];
      const res = await tryProvider<any>(best, best.discoveryModel, [
        { role: 'system', content: 'You are a senior cross-border eCommerce analyst. Write structured investment-grade opportunity reports. Return ONLY valid JSON.' },
        { role: 'user', content: `Write a comprehensive opportunity report for:
Product: ${title}
Category: ${category}
Marketplace: ${mkt} (${country})
Recommendation: ${rec.toUpperCase()}
Opportunity Score: ${scores.opportunity}/100
Demand: ${scores.demand} | Competition: ${scores.competition} | Margin: ${scores.margin} | Trend: ${scores.trend} | Shipping: ${scores.shipping}

Return JSON with these exact keys:
{"executive_summary":"...","market_opportunity":"...","sourcing_advantage":"...","financial_projection":"...","risk_factors":"...","recommended_actions":"...","verdict":"LAUNCH|HOLD|REJECT","score":${scores.opportunity},"generatedAt":"${new Date().toISOString()}"}
Be specific with numbers, timelines, and actionable advice.` },
      ], { maxTokens: 1200 });
      content = res?.result ?? null;
    }
    if (!content) content = staticReport(title, category, mkt, rec, scores);

    const now = Date.now();
    const newId = uuidv4();
    await db.execute({
      sql: `INSERT INTO "OpportunityReport" (id, opportunityId, content, createdAt) VALUES (?,?,?,?)`,
      args: [newId, params.id, JSON.stringify(content), now],
    });

    return NextResponse.json({ id: newId, createdAt: now, ...content });
  } catch (err: any) {
    console.error('Report generation error:', err);
    return NextResponse.json({ message: 'Report generation failed' }, { status: 500 });
  }
}

// DELETE /api/v1/opportunities/:id/reports/:reportId — deletes a specific report from history
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get('reportId');
    if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 });

    const db = getDb();
    await ensureSchema(db);
    await db.execute({
      sql: `DELETE FROM "OpportunityReport" WHERE id = ? AND opportunityId = ?`,
      args: [reportId, params.id],
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
