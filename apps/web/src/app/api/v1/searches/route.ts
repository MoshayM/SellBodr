import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { groqJSON, MODELS } from '@/lib/ai/gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Scoring weights (mirrors packages/core/scoring.ts)
const W = { demand: 0.22, margin: 0.20, competition: 0.16, trend: 0.14, marketplaceFit: 0.12, shipping: 0.10, saturation: 0.06 };

function oppScore(s: Record<string, number>): number {
  let base = s.demand * W.demand + s.margin * W.margin + s.competition * W.competition +
             s.trend * W.trend + s.marketplaceFit * W.marketplaceFit + s.shipping * W.shipping +
             s.saturation * W.saturation;
  if (s.margin < 30) base = Math.min(base, 49);
  if (s.shipping < 25) base = Math.min(base, 55);
  if (s.marketplaceFit < 30) base = Math.min(base, 45);
  return Math.round(Math.min(100, Math.max(0, base)));
}

function recommend(score: number, marginScore: number): 'launch' | 'hold' | 'reject' {
  if (score >= 70 && marginScore >= 35) return 'launch';
  if (score >= 50) return 'hold';
  return 'reject';
}

function confidence(score: number): number {
  if (score >= 80) return 85;
  if (score >= 60) return 72;
  if (score >= 40) return 58;
  return 45;
}

interface AiProduct {
  title: string;
  category: string;
  description: string;
  sourcePriceUSD: number;
  salePriceUSD: number;
  netMarginPct: number;
  scores: {
    demand: number; competition: number; margin: number;
    trend: number; marketplaceFit: number; shipping: number; saturation: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const marketplace: string = body.marketplace || 'amazon_us';

    const db = getDb();
    await ensureSchema(db);

    const searchId = crypto.randomUUID();
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO "Search" (id, marketplace, status, opportunityCount, createdAt) VALUES (?, ?, 'running', 0, ?)`,
      args: [searchId, marketplace, now],
    });

    // Derive readable marketplace name for prompt
    const mpName = marketplace.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Single FLASH call: ~1200 tokens in, ~900 out
    const prompt = `You are a cross-border eCommerce analyst. List exactly 8 Indian export products ideal for ${mpName}.
For each product output JSON with these fields (scores 0–100):
{"title","category","description","sourcePriceUSD","salePriceUSD","netMarginPct","scores":{"demand","competition","margin","trend","marketplaceFit","shipping","saturation"}}

Rules:
- competition: 100=lowest competition (good), 0=saturated
- saturation: 100=least saturated (good), 0=very saturated
- sourcePriceUSD: realistic Indian manufacturing cost
- salePriceUSD: realistic marketplace selling price
- netMarginPct: after all fees and shipping

Return a JSON array only. No prose.`;

    let products: AiProduct[] = [];
    try {
      products = await groqJSON<AiProduct[]>(MODELS.FLASH, [
        { role: 'system', content: 'Return only valid JSON arrays. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ], { maxTokens: 1400 });
    } catch (aiErr) {
      await db.execute({
        sql: `UPDATE "Search" SET status='failed', errorMessage=? WHERE id=?`,
        args: [String(aiErr).slice(0, 500), searchId],
      });
      return NextResponse.json({ error: 'AI pipeline failed', searchId }, { status: 502 });
    }

    if (!Array.isArray(products) || products.length === 0) {
      await db.execute({
        sql: `UPDATE "Search" SET status='failed', errorMessage='No products returned' WHERE id=?`,
        args: [searchId],
      });
      return NextResponse.json({ error: 'No products returned', searchId }, { status: 502 });
    }

    // Find marketplace row
    const mpRow = await db.execute({ sql: `SELECT id FROM "Marketplace" WHERE code=? LIMIT 1`, args: [marketplace] });
    const marketplaceId: string = mpRow.rows[0]?.id as string ?? '';

    let count = 0;
    for (const p of products.slice(0, 8)) {
      if (!p.title) continue;
      const productId = crypto.randomUUID();
      const opportunityId = crypto.randomUUID();
      const scoreId = crypto.randomUUID();
      const profitId = crypto.randomUUID();
      const ts = Date.now();

      const scores = p.scores ?? { demand: 60, competition: 60, margin: 60, trend: 60, marketplaceFit: 60, shipping: 60, saturation: 60 };
      const oScore = oppScore(scores);
      const rec = recommend(oScore, scores.margin);
      const conf = confidence(oScore);

      const sourceMinor = Math.round((p.sourcePriceUSD ?? 10) * 100);
      const saleMinor = Math.round((p.salePriceUSD ?? 30) * 100);
      const feeMinor = Math.round(saleMinor * 0.15);
      const shippingMinor = Math.round(sourceMinor * 0.30);
      const landedMinor = sourceMinor + shippingMinor;
      const netMinor = saleMinor - landedMinor - feeMinor;
      const marginPct = saleMinor > 0 ? (netMinor / saleMinor) * 100 : 0;

      await db.execute({
        sql: `INSERT INTO "Product" (id, title, category, description, createdAt) VALUES (?, ?, ?, ?, ?)`,
        args: [productId, p.title.slice(0, 200), (p.category ?? '').slice(0, 100), (p.description ?? '').slice(0, 500), ts],
      });
      await db.execute({
        sql: `INSERT INTO "Opportunity" (id, productId, marketplaceId, status, recommendation, confidence, createdAt) VALUES (?, ?, ?, 'active', ?, ?, ?)`,
        args: [opportunityId, productId, marketplaceId, rec, conf, ts],
      });
      await db.execute({
        sql: `INSERT INTO "Score" (id, opportunityId, opportunity, demand, competition, margin, trend, shipping, marketplaceFit, saturation, scoreVersion, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2.0.0', ?)`,
        args: [scoreId, opportunityId, oScore, scores.demand, scores.competition, scores.margin, scores.trend, scores.shipping, scores.marketplaceFit, scores.saturation, ts],
      });
      await db.execute({
        sql: `INSERT INTO "ProfitModel" (id, opportunityId, sourcePriceMinor, salePriceMinor, landedCostMinor, marketplaceFeeMinor, netProfitMinor, netMarginPct, roi, currency, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?)`,
        args: [profitId, opportunityId, sourceMinor, saleMinor, landedMinor, feeMinor, netMinor, Math.round(marginPct * 10) / 10, sourceMinor > 0 ? Math.round((netMinor / sourceMinor) * 1000) / 10 : 0, ts],
      });

      count++;
    }

    await db.execute({
      sql: `UPDATE "Search" SET status='complete', opportunityCount=?, completedAt=? WHERE id=?`,
      args: [count, Date.now(), searchId],
    });

    return NextResponse.json({ searchId, status: 'complete', count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
