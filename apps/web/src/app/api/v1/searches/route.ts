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

function productImageUrl(productId: string): string {
  return `https://picsum.photos/seed/${productId.slice(0, 10)}/400/300`;
}

function supplierName(category: string, idx: number): string {
  const bases = ['Exports India', 'Traders Pvt Ltd', 'Manufacturing Co', 'Industries Ltd', 'Handicrafts'];
  return `${category || 'Product'} ${bases[idx % bases.length]}`;
}

function indiamartSearchUrl(title: string): string {
  return `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(title.slice(0, 60))}`;
}

function getUserId(req: NextRequest): string {
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return '';
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return String(payload.sub ?? payload.userId ?? '');
  } catch { return ''; }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const marketplace: string = body.marketplace || 'amazon_us';
    const userId = getUserId(req);

    const db = getDb();
    await ensureSchema(db);

    const searchId = crypto.randomUUID();
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO "Search" (id, userId, marketplace, filters, status, opportunityCount, createdAt, updatedAt) VALUES (?, ?, ?, '{}', 'running', 0, ?, ?)`,
      args: [searchId, userId, marketplace, now, now],
    });

    // Derive readable marketplace name and current date context for trend-aware prompt
    const mpName = marketplace.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const month = new Date().toLocaleString('en-US', { month: 'long' });
    const year  = new Date().getFullYear();

    // Single FLASH call: ~1400 tokens in, ~1000 out — trend-aware prompt
    const prompt = `You are a cross-border eCommerce analyst. Today is ${today} (${month} ${year}).

List exactly 8 Indian-manufactured products that are CURRENTLY TRENDING on ${mpName} RIGHT NOW in ${month} ${year}.
Base your selection on: seasonal demand, current consumer trends, viral social commerce, and supply gaps in the destination market.
Prioritise products with rising search volume, low saturation, and practical Indian manufacturing advantage.

For each product output JSON:
{"title","category","description","sourcePriceUSD","salePriceUSD","netMarginPct","scores":{"demand","competition","margin","trend","marketplaceFit","shipping","saturation"}}

Score rules (0–100):
- demand: current search/buy demand this month
- competition: 100=low competition (good), 0=saturated
- margin: profit margin quality
- trend: 100=strongly rising trend right now, 0=declining
- marketplaceFit: how well this product suits ${mpName} rules and buyer expectations
- shipping: 100=easy to ship from India (light/non-hazardous), 0=restricted/fragile
- saturation: 100=not yet saturated, 0=fully saturated

Return a JSON array only. No prose, no markdown.`;

    let products: AiProduct[] = [];
    try {
      products = await groqJSON<AiProduct[]>(MODELS.FLASH, [
        { role: 'system', content: 'Return only valid JSON arrays. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ], { maxTokens: 1400 });
    } catch (aiErr) {
      await db.execute({
        sql: `UPDATE "Search" SET status='failed', errorMessage=?, updatedAt=? WHERE id=?`,
        args: [String(aiErr).slice(0, 500), Date.now(), searchId],
      });
      return NextResponse.json({ error: 'AI pipeline failed', searchId }, { status: 502 });
    }

    if (!Array.isArray(products) || products.length === 0) {
      await db.execute({
        sql: `UPDATE "Search" SET status='failed', errorMessage='No products returned', updatedAt=? WHERE id=?`,
        args: [Date.now(), searchId],
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

      const imgUrl = productImageUrl(productId);
      await db.execute({
        sql: `INSERT INTO "Product" (id, title, category, description, imageUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [productId, p.title.slice(0, 200), (p.category ?? '').slice(0, 100), (p.description ?? '').slice(0, 500), imgUrl, ts, ts],
      });
      await db.execute({
        sql: `INSERT INTO "Opportunity" (id, searchId, productId, marketplaceId, status, recommendation, confidence, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'scored', ?, ?, ?, ?)`,
        args: [opportunityId, searchId, productId, marketplaceId, rec, conf, ts, ts],
      });
      await db.execute({
        sql: `INSERT INTO "Score" (id, opportunityId, opportunity, demand, competition, margin, trend, shipping, marketplaceFit, saturation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [scoreId, opportunityId, oScore, scores.demand, scores.competition, scores.margin, scores.trend, scores.shipping, scores.marketplaceFit, scores.saturation, ts, ts],
      });
      const grossMinor = saleMinor - landedMinor;
      const roiPct = sourceMinor > 0 ? Math.round((netMinor / sourceMinor) * 1000) / 10 : 0;
      await db.execute({
        sql: `INSERT INTO "ProfitModel" (id, opportunityId, productCostMinor, salePriceMinor, landedCostMinor, marketplaceFeesMinor, grossProfitMinor, netProfitMinor, netMarginPct, roiPct, currency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?)`,
        args: [profitId, opportunityId, sourceMinor, saleMinor, landedMinor, feeMinor, grossMinor, netMinor, Math.round(marginPct * 10) / 10, roiPct, ts, ts],
      });

      // Insert 2 sourcing candidates per product
      const candidateData = [
        { name: supplierName(p.category, 0), source: 'indiamart', url: indiamartSearchUrl(p.title), costPct: 1.0, moq: 50, lead: 21, feas: 'moderate' },
        { name: supplierName(p.category, 1), source: 'alibaba',   url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(p.title.slice(0,40))}`, costPct: 0.9, moq: 100, lead: 35, feas: 'easy' },
      ];
      for (const c of candidateData) {
        await db.execute({
          sql: `INSERT INTO "SourcingCandidate" (id, opportunityId, supplierName, source, sourceUrl, productCostMinor, moq, leadTimeDays, feasibility, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [crypto.randomUUID(), opportunityId, c.name, c.source, c.url, Math.round(sourceMinor * c.costPct), c.moq, c.lead, c.feas, ts],
        });
      }

      count++;
    }

    const completedTs = Date.now();
    await db.execute({
      sql: `UPDATE "Search" SET status='complete', opportunityCount=?, completedAt=?, updatedAt=? WHERE id=?`,
      args: [count, completedTs, completedTs, searchId],
    });

    return NextResponse.json({ searchId, status: 'complete', count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
