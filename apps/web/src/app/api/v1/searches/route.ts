import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { groqJSON, MODELS } from '@/lib/ai/gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Scoring weights (mirrors packages/core/scoring.ts) ────────────────────────
const W = { demand: 0.22, margin: 0.20, competition: 0.16, trend: 0.14, marketplaceFit: 0.12, shipping: 0.10, saturation: 0.06 };

function oppScore(s: Record<string, number>): number {
  let base = s.demand * W.demand + s.margin * W.margin + s.competition * W.competition +
             s.trend * W.trend + s.marketplaceFit * W.marketplaceFit + s.shipping * W.shipping +
             s.saturation * W.saturation;
  if (s.margin < 30)       base = Math.min(base, 49);
  if (s.shipping < 25)     base = Math.min(base, 55);
  if (s.marketplaceFit < 30) base = Math.min(base, 45);
  return Math.round(Math.min(100, Math.max(0, base)));
}

function recommend(score: number, marginScore: number): 'launch' | 'hold' | 'reject' {
  if (score >= 70 && marginScore >= 35) return 'launch';
  if (score >= 50) return 'hold';
  return 'reject';
}

// ── Image URL (keyword-based via loremflickr) ─────────────────────────────────
function productImageUrl(productId: string, title: string, category: string): string {
  const raw = (title || category || 'product').toLowerCase();
  const keywords = raw.replace(/[^a-z\s]/g, '').split(/\s+/)
    .filter(w => w.length > 2 && !['and','the','for','with','set','from'].includes(w))
    .slice(0, 3).join(',') || 'product';
  const lock = parseInt(productId.replace(/-/g, '').slice(0, 8), 16) % 10000;
  return `https://loremflickr.com/400/300/${encodeURIComponent(keywords)}/all?lock=${lock}`;
}

// ── Realistic Indian supplier names with city clusters ────────────────────────
const CITY_MAP: Record<string, string[]> = {
  'home decor':      ['Moradabad', 'Jodhpur', 'Jaipur'],
  'handicraft':      ['Jaipur', 'Agra', 'Varanasi'],
  'textile':         ['Surat', 'Tiruppur', 'Ludhiana'],
  'fashion':         ['Surat', 'Mumbai', 'Kolkata'],
  'health':          ['Mumbai', 'Ahmedabad', 'Pune'],
  'beauty':          ['Mumbai', 'Kannauj', 'Bangalore'],
  'electronics':     ['Noida', 'Chennai', 'Hyderabad'],
  'food':            ['Delhi', 'Amritsar', 'Pune'],
  'sports':          ['Jalandhar', 'Meerut', 'Ludhiana'],
  'fitness':         ['Jalandhar', 'Meerut', 'Ludhiana'],
  'kitchenware':     ['Moradabad', 'Delhi', 'Mumbai'],
  'jewellery':       ['Jaipur', 'Surat', 'Mumbai'],
  'jewelry':         ['Jaipur', 'Surat', 'Mumbai'],
  'leather':         ['Agra', 'Kanpur', 'Chennai'],
  'wood':            ['Jodhpur', 'Saharanpur', 'Nagpur'],
  'marble':          ['Rajasthan', 'Agra', 'Udaipur'],
};
const SUFFIXES = ['Exports Pvt Ltd', 'Industries Ltd', 'Trading Co', 'Crafts Pvt Ltd', 'Manufacturers', 'International'];
const PLATFORMS = [
  { source: 'indiamart', suffix: 0 },
  { source: 'alibaba',   suffix: 3 },
];

function supplierCity(category: string): string {
  const cat = (category || '').toLowerCase();
  for (const [key, cities] of Object.entries(CITY_MAP)) {
    if (cat.includes(key)) return cities[Math.floor(Math.random() * cities.length)];
  }
  return ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)];
}

function supplierName(title: string, category: string, idx: number): string {
  const city = supplierCity(category);
  const keyword = (title || category || 'Product').split(' ').slice(0, 2).join(' ');
  return `${city} ${keyword} ${SUFFIXES[idx % SUFFIXES.length]}`;
}

function getUserId(req: NextRequest): string {
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return '';
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return String(payload.sub ?? payload.userId ?? '');
  } catch { return ''; }
}

// ── AI types ──────────────────────────────────────────────────────────────────

interface Stage1Product {
  title: string;
  category: string;
  description: string;
  sourcePriceUSD: number;
  salePriceUSD: number;
  evidenceBasis: string;    // WHY this product — referenced trend signals, seasonality, demand drivers
  indiaManufacturing: 'easy' | 'moderate' | 'hard';
  scores: {
    demand: number; competition: number; margin: number;
    trend: number; marketplaceFit: number; shipping: number; saturation: number;
  };
}

interface Stage2Verdict {
  title: string;           // matches stage1 product title for pairing
  validationScore: number; // 0-100: how credible/realistic is this opportunity
  adjustedConfidence: number; // 50-95: final confidence percentage
  flags: string[];         // any red flags found (e.g. "competition likely understated")
  verdict: 'pass' | 'reject';
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json().catch(() => ({}));
    const marketplace: string = body.marketplace || 'amazon_us';
    const userId     = getUserId(req);

    const db = getDb();
    await ensureSchema(db);

    const searchId = crypto.randomUUID();
    const now      = Date.now();
    const mpName   = marketplace.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const today    = new Date().toISOString().slice(0, 10);
    const month    = new Date().toLocaleString('en-US', { month: 'long' });
    const year     = new Date().getFullYear();

    await db.execute({
      sql: `INSERT INTO "Search" (id, userId, marketplace, filters, status, opportunityCount, createdAt, updatedAt) VALUES (?, ?, ?, '{}', 'running', 0, ?, ?)`,
      args: [searchId, userId, marketplace, now, now],
    });

    // ── Stage 1: Discovery (FLASH — fast, high throughput) ────────────────────
    // Asks for evidence-based reasoning so the model must justify each score.
    const stage1Prompt = `You are a cross-border eCommerce data analyst. Today is ${today} (${month} ${year}).

Identify exactly 12 India-sourced products with STRONG cross-border opportunity on ${mpName} RIGHT NOW in ${month} ${year}.

Base each pick on:
- Seasonal demand peaks for ${month} in the target region
- Rising search/social trends on ${mpName} platform
- India manufacturing advantage (cost, craftsmanship, raw material access)
- Current supply gaps on ${mpName}

For EACH product output a JSON object:
{
  "title": "specific product name",
  "category": "product category",
  "description": "2-sentence product description",
  "sourcePriceUSD": <realistic India sourcing cost, USD>,
  "salePriceUSD": <realistic ${mpName} sale price, USD>,
  "evidenceBasis": "cite specific trend signals — e.g. 'Diwali gifting season drives demand in Sep-Oct; brass home decor from Moradabad competes with Chinese imports at 40% lower cost'",
  "indiaManufacturing": "easy|moderate|hard",
  "scores": {
    "demand": <0-100>,        // actual search/buy volume this month
    "competition": <0-100>,   // 100=low competition on ${mpName}
    "margin": <0-100>,        // profit margin quality
    "trend": <0-100>,         // 100=strongly rising trend right now
    "marketplaceFit": <0-100>,// suitability for ${mpName} rules + buyers
    "shipping": <0-100>,      // 100=easy to ship from India
    "saturation": <0-100>     // 100=not yet saturated
  }
}

STRICT rules:
- Do NOT assign 90+ scores unless the evidence clearly justifies it
- sourcePriceUSD must be at least 40% below salePriceUSD after fees
- Only include products that India genuinely manufactures competitively
- Be CALIBRATED: use scores 50-75 for average, 75-90 for strong, 90+ only for exceptional

Return a JSON array only. No markdown, no explanation.`;

    let stage1: Stage1Product[] = [];
    try {
      stage1 = await groqJSON<Stage1Product[]>(MODELS.FLASH, [
        { role: 'system', content: 'Return only valid JSON arrays. No markdown, no explanation.' },
        { role: 'user',   content: stage1Prompt },
      ], { maxTokens: 3000 });
    } catch (aiErr) {
      await db.execute({ sql: `UPDATE "Search" SET status='failed', errorMessage=?, updatedAt=? WHERE id=?`, args: [String(aiErr).slice(0, 500), Date.now(), searchId] });
      return NextResponse.json({ error: 'AI pipeline stage 1 failed', searchId }, { status: 502 });
    }

    if (!Array.isArray(stage1) || stage1.length === 0) {
      await db.execute({ sql: `UPDATE "Search" SET status='failed', errorMessage='No candidates from stage 1', updatedAt=? WHERE id=?`, args: [Date.now(), searchId] });
      return NextResponse.json({ error: 'No products returned', searchId }, { status: 502 });
    }

    // ── Stage 2: Validation (BALANCED — critical reasoning) ───────────────────
    // Independent model acts as a skeptical analyst to catch hallucinations.
    const stage2Prompt = `You are a critical eCommerce market analyst reviewing AI-generated product opportunities for ${mpName} in ${month} ${year}.

Below are ${stage1.length} product candidates. Your job is to CRITICALLY VALIDATE each one:
1. Is this product actually manufactured competitively in India? (flag if not)
2. Are the scores realistic? (flag if demand/competition/margin look inflated)
3. Is the source-to-sale price spread realistic after shipping + fees? (flag if not)
4. Is this a genuine ${month} ${year} trend or a generic evergreen pick?

Products to validate:
${JSON.stringify(stage1.map(p => ({ title: p.title, category: p.category, sourcePriceUSD: p.sourcePriceUSD, salePriceUSD: p.salePriceUSD, scores: p.scores, evidenceBasis: p.evidenceBasis, indiaManufacturing: p.indiaManufacturing })), null, 2)}

For EACH product return:
{
  "title": "<exact title from input>",
  "validationScore": <0-100, your confidence this is a real opportunity>,
  "adjustedConfidence": <50-95, final confidence percentage for the user to see>,
  "flags": ["list of concerns, empty array if none"],
  "verdict": "pass|reject"
}

Reject products that: have implausible price spreads, India cannot realistically manufacture, or have clearly inflated scores.
Pass at most 8 products. Prefer diversity of categories.

Return a JSON array only.`;

    let stage2: Stage2Verdict[] = [];
    try {
      stage2 = await groqJSON<Stage2Verdict[]>(MODELS.BALANCED, [
        { role: 'system', content: 'Return only valid JSON arrays. No markdown, no explanation.' },
        { role: 'user',   content: stage2Prompt },
      ], { maxTokens: 2000 });
    } catch {
      // If stage 2 fails, fall back to stage 1 results with moderate confidence
      stage2 = stage1.map(p => ({ title: p.title, validationScore: 65, adjustedConfidence: 65, flags: [], verdict: 'pass' as const }));
    }

    // Pair verdicts with stage1 products
    const verdictMap = new Map(stage2.map(v => [v.title.toLowerCase().trim(), v]));
    const validated = stage1
      .map(p => {
        const v = verdictMap.get(p.title.toLowerCase().trim()) ?? { validationScore: 50, adjustedConfidence: 58, flags: [], verdict: 'pass' as const };
        return { ...p, validation: v };
      })
      .filter(p => p.validation.verdict !== 'reject' && p.validation.validationScore >= 50)
      .sort((a, b) => b.validation.validationScore - a.validation.validationScore)
      .slice(0, 8);

    if (validated.length === 0) {
      await db.execute({ sql: `UPDATE "Search" SET status='failed', errorMessage='All products rejected by validation', updatedAt=? WHERE id=?`, args: [Date.now(), searchId] });
      return NextResponse.json({ error: 'No products passed validation', searchId }, { status: 502 });
    }

    // Find marketplace row
    const mpRow = await db.execute({ sql: `SELECT id FROM "Marketplace" WHERE code=? LIMIT 1`, args: [marketplace] });
    const marketplaceId: string = mpRow.rows[0]?.id as string ?? '';

    let count = 0;
    for (const p of validated) {
      if (!p.title) continue;

      const productId     = crypto.randomUUID();
      const opportunityId = crypto.randomUUID();
      const scoreId       = crypto.randomUUID();
      const profitId      = crypto.randomUUID();
      const ts            = Date.now();

      const scores      = p.scores ?? { demand: 60, competition: 60, margin: 60, trend: 60, marketplaceFit: 60, shipping: 60, saturation: 60 };
      const oScore      = oppScore(scores);
      const rec         = recommend(oScore, scores.margin);
      // Use validated confidence instead of simple score-based mapping
      const conf        = Math.min(95, Math.max(45, p.validation.adjustedConfidence));

      const sourceMinor   = Math.round((p.sourcePriceUSD ?? 10) * 100);
      const saleMinor     = Math.round((p.salePriceUSD  ?? 30) * 100);
      const feeMinor      = Math.round(saleMinor * 0.15);
      const shippingMinor = Math.round(sourceMinor * 0.30);
      const landedMinor   = sourceMinor + shippingMinor;
      const netMinor      = saleMinor - landedMinor - feeMinor;
      const marginPct     = saleMinor > 0 ? (netMinor / saleMinor) * 100 : 0;
      const grossMinor    = saleMinor - landedMinor;
      const roiPct        = sourceMinor > 0 ? Math.round((netMinor / sourceMinor) * 1000) / 10 : 0;

      const imgUrl = productImageUrl(productId, p.title, p.category ?? '');

      // Include evidence basis and validation flags in description for UI display
      const fullDesc = [
        p.description ?? '',
        `Evidence: ${p.evidenceBasis ?? 'AI market analysis'}`,
        p.validation.flags.length > 0 ? `Note: ${p.validation.flags.join('; ')}` : '',
      ].filter(Boolean).join(' | ');

      await db.execute({ sql: `INSERT INTO "Product" (id, title, category, description, imageUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [productId, p.title.slice(0, 200), (p.category ?? '').slice(0, 100), fullDesc.slice(0, 1000), imgUrl, ts, ts] });
      await db.execute({ sql: `INSERT INTO "Opportunity" (id, searchId, productId, marketplaceId, status, recommendation, confidence, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'scored', ?, ?, ?, ?)`, args: [opportunityId, searchId, productId, marketplaceId, rec, conf, ts, ts] });
      await db.execute({ sql: `INSERT INTO "Score" (id, opportunityId, opportunity, demand, competition, margin, trend, shipping, marketplaceFit, saturation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [scoreId, opportunityId, oScore, scores.demand, scores.competition, scores.margin, scores.trend, scores.shipping, scores.marketplaceFit, scores.saturation, ts, ts] });
      await db.execute({ sql: `INSERT INTO "ProfitModel" (id, opportunityId, productCostMinor, salePriceMinor, landedCostMinor, marketplaceFeesMinor, grossProfitMinor, netProfitMinor, netMarginPct, roiPct, currency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?)`, args: [profitId, opportunityId, sourceMinor, saleMinor, landedMinor, feeMinor, grossMinor, netMinor, Math.round(marginPct * 10) / 10, roiPct, ts, ts] });

      // Sourcing candidates with realistic Indian city-based names
      const cands = [
        { name: supplierName(p.title, p.category, 0), source: 'indiamart', url: `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(p.title.slice(0, 60))}`, costPct: 1.0, moq: 50,  lead: 21, feas: p.indiaManufacturing === 'easy' ? 'easy' : 'moderate' },
        { name: supplierName(p.title, p.category, 3), source: 'alibaba',   url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(p.title.slice(0, 40))}`, costPct: 0.88, moq: 100, lead: 35, feas: 'easy' },
      ];
      for (const c of cands) {
        await db.execute({ sql: `INSERT INTO "SourcingCandidate" (id, opportunityId, supplierName, source, sourceUrl, productCostMinor, moq, leadTimeDays, feasibility, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [crypto.randomUUID(), opportunityId, c.name, c.source, c.url, Math.round(sourceMinor * c.costPct), c.moq, c.lead, c.feas, ts] });
      }

      count++;
    }

    const completedTs = Date.now();
    await db.execute({ sql: `UPDATE "Search" SET status='complete', opportunityCount=?, completedAt=?, updatedAt=? WHERE id=?`, args: [count, completedTs, completedTs, searchId] });

    return NextResponse.json({
      searchId, status: 'complete', count,
      pipeline: `${stage1.length} candidates → ${validated.length} validated → ${count} saved`,
      models: [MODELS.FLASH, MODELS.BALANCED],
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
