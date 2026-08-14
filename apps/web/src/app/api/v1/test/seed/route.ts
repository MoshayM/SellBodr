import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

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

function recommend(score: number, margin: number): 'launch' | 'hold' | 'reject' {
  if (score >= 70 && margin >= 35) return 'launch';
  if (score >= 50) return 'hold';
  return 'reject';
}

const MOCK = [
  { title: 'Brass Decorative Showpiece', category: 'Home Decor', description: 'Traditional Indian brass showpiece for home decoration', sourceUSD: 8, saleUSD: 29, scores: { demand: 78, competition: 72, margin: 65, trend: 70, marketplaceFit: 80, shipping: 85, saturation: 75 } },
  { title: 'Handcrafted Jute Bag', category: 'Fashion Accessories', description: 'Eco-friendly handcrafted jute shopping bag from India', sourceUSD: 4, saleUSD: 19, scores: { demand: 82, competition: 68, margin: 70, trend: 75, marketplaceFit: 85, shipping: 90, saturation: 70 } },
  { title: 'Ayurvedic Skincare Set', category: 'Health & Beauty', description: 'Natural Ayurvedic skincare products set', sourceUSD: 12, saleUSD: 45, scores: { demand: 88, competition: 60, margin: 75, trend: 85, marketplaceFit: 88, shipping: 80, saturation: 65 } },
  { title: 'Wooden Yoga Block Set', category: 'Sports & Fitness', description: 'Premium wooden yoga blocks for fitness enthusiasts', sourceUSD: 10, saleUSD: 35, scores: { demand: 75, competition: 65, margin: 68, trend: 72, marketplaceFit: 82, shipping: 78, saturation: 72 } },
];

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const marketplace: string = body.marketplace || 'amazon_us';

    const db = getDb();
    await ensureSchema(db);

    const mpRow = await db.execute({ sql: `SELECT id FROM "Marketplace" WHERE code=? LIMIT 1`, args: [marketplace] });
    let marketplaceId: string = mpRow.rows[0]?.id as string ?? '';
    if (!marketplaceId) {
      // ensureSchema didn't seed this marketplace yet — insert it directly
      const newMpId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT OR IGNORE INTO "Marketplace" (id, code, country, currency, feeSchedule, active, createdAt) VALUES (?, ?, 'us', 'USD', '{"referralPct":15,"fbaFeeMinor":300}', 1, ?)`,
        args: [newMpId, marketplace, Date.now()],
      });
      const mpRow2 = await db.execute({ sql: `SELECT id FROM "Marketplace" WHERE code=? LIMIT 1`, args: [marketplace] });
      marketplaceId = mpRow2.rows[0]?.id as string ?? newMpId;
    }

    let count = 0;
    for (const p of MOCK) {
      const productId = crypto.randomUUID();
      const opportunityId = crypto.randomUUID();
      const ts = Date.now();

      const oScore = oppScore(p.scores);
      const rec = recommend(oScore, p.scores.margin);
      const conf = oScore >= 80 ? 85 : oScore >= 60 ? 72 : 58;

      const srcMinor = Math.round(p.sourceUSD * 100);
      const saleMinor = Math.round(p.saleUSD * 100);
      const feeMinor = Math.round(saleMinor * 0.15);
      const landedMinor = srcMinor + Math.round(srcMinor * 0.30);
      const netMinor = saleMinor - landedMinor - feeMinor;
      const marginPct = saleMinor > 0 ? (netMinor / saleMinor) * 100 : 0;

      const seedSearchId = 'seed-' + opportunityId;
      const grossMinor = saleMinor - landedMinor;
      const roiPct = srcMinor > 0 ? Math.round((netMinor / srcMinor) * 1000) / 10 : 0;
      const raw = (p.title || p.category || 'product').toLowerCase().replace(/[^a-z\s]/g, '');
      const keywords = raw.split(/\s+/).filter((w: string) => w.length > 2 && !['and','the','for','with','set'].includes(w)).slice(0, 3).join(',') || 'product';
      const lock = parseInt(productId.replace(/-/g, '').slice(0, 8), 16) % 10000;
      const imgUrl = `https://loremflickr.com/400/300/${encodeURIComponent(keywords)}/all?lock=${lock}`;
      await db.execute({ sql: `INSERT INTO "Product" (id, title, category, description, imageUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [productId, p.title, p.category, p.description, imgUrl, ts, ts] });
      await db.execute({ sql: `INSERT INTO "Opportunity" (id, searchId, productId, marketplaceId, status, recommendation, confidence, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'scored', ?, ?, ?, ?)`, args: [opportunityId, seedSearchId, productId, marketplaceId, rec, conf, ts, ts] });
      await db.execute({ sql: `INSERT INTO "Score" (id, opportunityId, opportunity, demand, competition, margin, trend, shipping, marketplaceFit, saturation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [crypto.randomUUID(), opportunityId, oScore, p.scores.demand, p.scores.competition, p.scores.margin, p.scores.trend, p.scores.shipping, p.scores.marketplaceFit, p.scores.saturation, ts, ts] });
      await db.execute({ sql: `INSERT INTO "ProfitModel" (id, opportunityId, productCostMinor, salePriceMinor, landedCostMinor, marketplaceFeesMinor, grossProfitMinor, netProfitMinor, netMarginPct, roiPct, currency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?)`, args: [crypto.randomUUID(), opportunityId, srcMinor, saleMinor, landedMinor, feeMinor, grossMinor, netMinor, Math.round(marginPct * 10) / 10, roiPct, ts, ts] });

      // Sourcing candidates
      const srcBases = ['Exports India', 'Traders Pvt Ltd'];
      const cands = [
        { name: `${p.category} ${srcBases[0]}`, source: 'indiamart', url: `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(p.title)}`, costM: srcMinor, moq: 50, lead: 21, feas: 'moderate' },
        { name: `${p.category} ${srcBases[1]}`, source: 'alibaba',   url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(p.title.slice(0,40))}`, costM: Math.round(srcMinor * 0.88), moq: 100, lead: 35, feas: 'easy' },
      ];
      for (const c of cands) {
        await db.execute({ sql: `INSERT INTO "SourcingCandidate" (id, opportunityId, supplierName, source, sourceUrl, productCostMinor, moq, leadTimeDays, feasibility, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [crypto.randomUUID(), opportunityId, c.name, c.source, c.url, c.costM, c.moq, c.lead, c.feas, ts] });
      }

      count++;
    }

    return NextResponse.json({ count, status: 'seeded' });
  } catch (err) {
    console.error('Seed endpoint error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
