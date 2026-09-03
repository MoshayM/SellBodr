import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { callAllProviders, callBestValidator, titleSimilarity, Provider } from '@/lib/ai/gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Scoring weights (mirrors packages/core/scoring.ts) ────────────────────────
const W = { demand: 0.22, margin: 0.20, competition: 0.16, trend: 0.14, marketplaceFit: 0.12, shipping: 0.10, saturation: 0.06 };

function oppScore(s: Record<string, number>): number {
  let base = s.demand * W.demand + s.margin * W.margin + s.competition * W.competition +
             s.trend * W.trend + s.marketplaceFit * W.marketplaceFit + s.shipping * W.shipping +
             s.saturation * W.saturation;
  if (s.margin < 30)         base = Math.min(base, 49);
  if (s.shipping < 25)       base = Math.min(base, 55);
  if (s.marketplaceFit < 30) base = Math.min(base, 45);
  return Math.round(Math.min(100, Math.max(0, base)));
}

function recommend(score: number, marginScore: number): 'launch' | 'hold' | 'reject' {
  if (score >= 70 && marginScore >= 35) return 'launch';
  if (score >= 50) return 'hold';
  return 'reject';
}

// ── Product image: Pexels → Google CSE → Unsplash → picsum fallback ──────────
async function productImageUrl(_productId: string, title: string, category: string): Promise<string> {
  const words = [...title.split(' ').slice(0, 3), category.replace(/_/g, ' ').split(' ')[0]]
    .filter(Boolean).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const kwQuery = title.trim() || words.join(' ');
  const seed    = words.slice(0, 3).join('-') || 'product';

  // 1️⃣ Pexels — free, no billing, real product photos
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(kwQuery)}&per_page=1&orientation=landscape`,
        { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        const data = await res.json() as any;
        const url = data?.photos?.[0]?.src?.medium || data?.photos?.[0]?.src?.small;
        if (url) return url;
      }
    } catch { /* fall through */ }
  }

  // 2️⃣ Google Custom Search Image API — real product photos from shopping sites
  const gApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
  const gCseId  = process.env.GOOGLE_CSE_ID  || process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (gApiKey && gCseId) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${gApiKey}&cx=${gCseId}&q=${encodeURIComponent(kwQuery + ' product')}&searchType=image&num=1&imgType=photo&imgSize=medium&safe=active&fields=items(link)`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json() as any;
        const link = data?.items?.[0]?.link;
        if (link && link.startsWith('http')) return link;
      }
    } catch { /* fall through */ }
  }

  // 3️⃣ Unsplash API
  const uKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_API_KEY;
  if (uKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(kwQuery)}&orientation=landscape&client_id=${uKey}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        const data = await res.json() as any;
        const url = data?.urls?.small || data?.urls?.regular;
        if (url) return url;
      }
    } catch { /* fall through */ }
  }

  // 4️⃣ Picsum — reliable Cloudflare CDN, seeded for consistency
  return `https://picsum.photos/seed/${seed}/400/300`;
}

// ── Indian city coordinates (for map pins) ────────────────────────────────────
const INDIAN_CITY_COORDS: Record<string, [number, number]> = {
  Jaipur: [26.9124, 75.7873], Moradabad: [28.8386, 78.7733], Jodhpur: [26.2389, 73.0243],
  Surat: [21.1702, 72.8311], Tiruppur: [11.1085, 77.3411], Ludhiana: [30.9010, 75.8573],
  Mumbai: [19.0760, 72.8777], Ahmedabad: [23.0225, 72.5714], Kannauj: [27.0566, 79.9245],
  Bangalore: [12.9716, 77.5946], Noida: [28.5355, 77.3910], Chennai: [13.0827, 80.2707],
  Hyderabad: [17.3850, 78.4867], Delhi: [28.6139, 77.2090], Agra: [27.1767, 78.0081],
  Varanasi: [25.3176, 82.9739], Jalandhar: [31.3260, 75.5762], Meerut: [28.9845, 77.7064],
  Amritsar: [31.6340, 74.8723], Kanpur: [26.4499, 80.3319], Pune: [18.5204, 73.8567],
  Kolkata: [22.5726, 88.3639], Nagpur: [21.1458, 79.0882],
};

// ── Supplier name with Indian city clusters ───────────────────────────────────
const CITY_MAP: Record<string, string[]> = {
  'home decor':  ['Moradabad', 'Jodhpur', 'Jaipur'],
  'handicraft':  ['Jaipur', 'Agra', 'Varanasi'],
  'textile':     ['Surat', 'Tiruppur', 'Ludhiana'],
  'fashion':     ['Surat', 'Mumbai', 'Kolkata'],
  'health':      ['Mumbai', 'Ahmedabad', 'Pune'],
  'beauty':      ['Mumbai', 'Kannauj', 'Bangalore'],
  'electronics': ['Noida', 'Chennai', 'Hyderabad'],
  'food':        ['Delhi', 'Amritsar', 'Pune'],
  'sports':      ['Jalandhar', 'Meerut', 'Ludhiana'],
  'fitness':     ['Jalandhar', 'Meerut', 'Ludhiana'],
  'kitchen':     ['Moradabad', 'Delhi', 'Mumbai'],
  'jewellery':   ['Jaipur', 'Surat', 'Mumbai'],
  'jewelry':     ['Jaipur', 'Surat', 'Mumbai'],
  'leather':     ['Agra', 'Kanpur', 'Chennai'],
  'wood':        ['Jodhpur', 'Saharanpur', 'Nagpur'],
};
const SUFFIXES = ['Exports Pvt Ltd', 'Industries Ltd', 'Trading Co', 'Crafts Pvt Ltd', 'Manufacturers', 'International'];

function supplierCity(category: string): string {
  const cat = (category || '').toLowerCase();
  for (const [key, cities] of Object.entries(CITY_MAP)) {
    if (cat.includes(key)) {
      const idx = Math.abs(cat.charCodeAt(0) + cat.length) % cities.length;
      return cities[idx];
    }
  }
  const fallbacks = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'];
  return fallbacks[Math.abs((category || '').charCodeAt(0) ?? 0) % fallbacks.length];
}

function supplierName(title: string, category: string, idx: number): string {
  const city    = supplierCity(category);
  const keyword = (title || category || 'Product').split(' ').slice(0, 2).join(' ');
  return `${city} ${keyword} ${SUFFIXES[idx % SUFFIXES.length]}`;
}

function getTokenPayload(req: NextRequest): { userId: string; role: string; plan: string } {
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return { userId: '', role: '', plan: '' };
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return {
      userId: String(payload.sub ?? payload.userId ?? ''),
      role:   String(payload.role ?? ''),
      plan:   String(payload.plan ?? ''),
    };
  } catch { return { userId: '', role: '', plan: '' }; }
}

function getUserId(req: NextRequest): string {
  return getTokenPayload(req).userId;
}

// ── AI types ──────────────────────────────────────────────────────────────────

interface AiCandidate {
  title:               string;
  category:            string;
  description:         string;
  sourcePriceUSD:      number;
  salePriceUSD:        number;
  evidenceBasis:       string;
  indiaManufacturing:  'easy' | 'moderate' | 'hard';
  scores: {
    demand: number; competition: number; margin: number;
    trend: number; marketplaceFit: number; shipping: number; saturation: number;
  };
}

interface MergedCandidate extends AiCandidate {
  providerCount: number;
  providerNames: string[];
  avgQuality:    number;
  scoreVariance: number;
}

interface ValidationVerdict {
  title:              string;
  validationScore:    number;
  adjustedConfidence: number;
  flags:              string[];
  verdict:            'pass' | 'reject';
}

// ── Ensemble helpers ──────────────────────────────────────────────────────────

function mergeProviderResults(
  providerResults: Array<{ provider: Provider; result: AiCandidate[] }>
): MergedCandidate[] {
  const groups: Array<{ candidates: AiCandidate[]; providers: Provider[] }> = [];

  for (const { provider, result } of providerResults) {
    if (!Array.isArray(result)) continue;
    for (const candidate of result) {
      if (!candidate?.title) continue;
      const existing = groups.find(g =>
        g.candidates.some(c => titleSimilarity(c.title, candidate.title) >= 0.4)
      );
      if (existing) {
        existing.candidates.push(candidate);
        existing.providers.push(provider);
      } else {
        groups.push({ candidates: [candidate], providers: [provider] });
      }
    }
  }

  return groups.map(group => {
    const totalQ   = group.providers.reduce((s, p) => s + p.quality, 0);
    const wavg     = (f: string) =>
      group.candidates.reduce((s, c, i) => s + (c as any).scores[f] * group.providers[i].quality, 0) / totalQ;
    const demands  = group.candidates.map(c => c.scores.demand);
    const mean     = demands.reduce((a, b) => a + b, 0) / demands.length;
    const variance = demands.length > 1
      ? demands.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / demands.length : 0;
    const bestIdx  = group.providers.reduce((bi, p, i) => p.quality > group.providers[bi].quality ? i : bi, 0);
    return {
      ...group.candidates[bestIdx],
      scores: {
        demand:         Math.round(wavg('demand')),
        competition:    Math.round(wavg('competition')),
        margin:         Math.round(wavg('margin')),
        trend:          Math.round(wavg('trend')),
        marketplaceFit: Math.round(wavg('marketplaceFit')),
        shipping:       Math.round(wavg('shipping')),
        saturation:     Math.round(wavg('saturation')),
      },
      providerCount:  group.providers.length,
      providerNames:  [...new Set(group.providers.map(p => p.name))],
      avgQuality:     totalQ / group.providers.length,
      scoreVariance:  Math.round(variance),
    };
  });
}

function consensusConfidence(c: MergedCandidate, validationScore: number): number {
  const baseQ          = Math.round(c.avgQuality * 90);
  const consensusBonus = (c.providerCount - 1) * 8;
  const variancePenalty = c.scoreVariance > 200 ? -10 : 0;
  const raw = (baseQ + consensusBonus + variancePenalty) * (validationScore / 100);
  return Math.min(95, Math.max(45, Math.round(raw)));
}

// ── Prompts ───────────────────────────────────────────────────────────────────

type FocusHints = { category?: string; trendStrength?: string; trendSource?: string };

function contextualDiscoveryPrompt(mpName: string, today: string, month: string, year: number, focus: FocusHints): string {
  const strengthMap: Record<string, string> = {
    hot:      'TRENDING HOT (trend score 80–100) — viral momentum, rapidly growing demand right now',
    rising:   'RISING (trend score 60–79) — steady upward momentum, gaining traction week-over-week',
    stable:   'STABLE (trend score 40–59) — consistent, reliable demand, not trending but dependable',
    declining:'NICHE/DECLINING (trend score <40) — loyal niche buyers, low competition',
  };
  const sourceMap: Record<string, string> = {
    search:  'Amazon/search-driven organic demand (keyword search traffic, high purchase intent)',
    social:  'social-commerce demand (TikTok Shop virality, Instagram reels, social buzz)',
    curated: 'curated/artisan marketplace demand (Etsy buyers, handmade, one-of-a-kind)',
    value:   'value marketplace demand (Walmart, budget-conscious buyers, price sensitivity)',
  };
  const trendScoreRange: Record<string, string> = {
    hot:      '80-100 (REQUIRED: this is a hot trending product)',
    rising:   '60-79 (REQUIRED: this is a rising product)',
    stable:   '40-59 (REQUIRED: this is a stable product)',
    declining:'0-39 (REQUIRED: this is a niche/declining product)',
  };

  const catNote      = focus.category      ? `\nCATEGORY: Focus ONLY on products within or closely related to "${focus.category}". Every product must fit this category.` : '';
  const strengthNote = focus.trendStrength ? `\nTREND LEVEL: All products must be ${strengthMap[focus.trendStrength] ?? focus.trendStrength}.` : '';
  const sourceNote   = focus.trendSource   ? `\nDEMAND SIGNAL: Prioritise products with ${sourceMap[focus.trendSource] ?? focus.trendSource}.` : '';

  return `You are a senior cross-border eCommerce analyst specialising in India-to-global exports. Today: ${today} (${month} ${year}).

TARGETED SCAN — Find exactly 10 DISTINCT, HIGH-OPPORTUNITY products for ${mpName} that precisely match the criteria below.
${catNote}${strengthNote}${sourceNote}

HARD RULES:
1. SPECIFICITY — Use precise, descriptive product names. BAD: "Brass Vase". GOOD: "Hand-hammered Brass Flower Vase with Geometric Cutwork Pattern".
2. DIVERSITY — All 10 products MUST be from different sub-categories. No two products in the same niche.
3. NOVELTY — Focus on products with clear India craft/manufacturing advantage not easily replicated elsewhere.
4. ON-TARGET — Every product must match the specified category${focus.trendStrength ? ` and ${focus.trendStrength} trend profile` : ''}.

Criteria:
- Strong demand on ${mpName} in ${month} ${year} matching the focus above
- India has a clear cost or craftsmanship advantage vs China/other sources
- Price spread: India source cost at least 45% below ${mpName} sale price after all fees
- Not oversaturated — room for a new seller in 60–90 days

For EACH product return:
{
  "title": "specific descriptive product name",
  "category": "precise sub-category",
  "description": "2 sentences — what makes this special and why buyers want it NOW",
  "sourcePriceUSD": <India factory cost USD>,
  "salePriceUSD": <${mpName} sale price USD>,
  "evidenceBasis": "concrete demand signals matching the trend/channel focus above",
  "indiaManufacturing": "easy|moderate|hard",
  "scores": {
    "demand": <0-100>,
    "competition": <0-100, higher=less competition>,
    "margin": <0-100>,
    "trend": <${focus.trendStrength ? (trendScoreRange[focus.trendStrength] ?? '0-100') : '0-100 current momentum'}>,
    "marketplaceFit": <0-100>,
    "shipping": <0-100>,
    "saturation": <0-100, higher=less saturated>
  }
}

SCORE CALIBRATION: 50-69=average, 70-84=strong, 85-100=exceptional.
Return JSON array only. No markdown, no explanation.`;
}

function discoveryPrompt(mpName: string, today: string, month: string, year: number): string {
  return `You are a senior cross-border eCommerce analyst specialising in India-to-global exports. Today: ${today} (${month} ${year}).

Find exactly 10 DISTINCT, HIGH-OPPORTUNITY products for ${mpName} RIGHT NOW.

HARD RULES:
1. SPECIFICITY — Use precise, descriptive product names. BAD: "Brass Vase", "Cotton Scarf". GOOD: "Hand-hammered Brass Flower Vase with Geometric Cutwork Pattern", "Hand-block Printed Ajrakh Cotton Stole in Indigo Blue".
2. DIVERSITY — All 10 products MUST be from different sub-categories. No two products in the same niche.
3. NOVELTY — Avoid generic commodity items (plain t-shirts, basic mugs, generic earphones, simple candles). Focus on products with a clear India craft/manufacturing differentiation that is hard to replicate cheaply elsewhere.
4. CURRENT — Must have genuine buying signals on ${mpName} in ${month} ${year} (seasonal demand, trending searches, social virality, supply gaps).

Criteria:
- Strong search/purchase demand on ${mpName} right now
- India has a clear cost or craftsmanship advantage vs China/other sources
- Price spread: India source cost at least 45% below ${mpName} sale price after all fees
- Not oversaturated — room for a new seller to get traction in 60–90 days

For EACH product return:
{
  "title": "specific descriptive product name with differentiating detail",
  "category": "precise sub-category",
  "description": "2 sentences — exactly what makes this product special and why buyers want it NOW",
  "sourcePriceUSD": <realistic India factory/wholesale cost USD>,
  "salePriceUSD": <realistic ${mpName} current market sale price USD>,
  "evidenceBasis": "concrete signals: specific search trend, seasonal event, social platform buzz, supply gap vs competitors, or price arbitrage data",
  "indiaManufacturing": "easy|moderate|hard",
  "scores": {
    "demand": <0-100 current buyer demand on ${mpName}>,
    "competition": <0-100, higher=less competition>,
    "margin": <0-100 net profit quality after fees>,
    "trend": <0-100 current momentum strength>,
    "marketplaceFit": <0-100 suitability for ${mpName} platform and audience>,
    "shipping": <0-100 ease of air/sea freight from India>,
    "saturation": <0-100, higher=less saturated, more room to enter>
  }
}

SCORE CALIBRATION: 50-69=average, 70-84=strong, 85-100=exceptional (rare, needs hard evidence).
Return JSON array only. No markdown, no explanation.`;
}

function validationPrompt(mpName: string, month: string, year: number, candidates: MergedCandidate[]): string {
  return `You are a critical eCommerce analyst. Challenge and validate these AI-generated product opportunities for ${mpName} in ${month} ${year}.

For each candidate assess:
1. Does India ACTUALLY manufacture this competitively?
2. Are demand/competition/margin scores realistic?
3. Is the price spread plausible after marketplace fees + FBA + shipping?
4. Is this a genuine current trend or generic filler?

Note: products with agreedByProviders > 1 had independent model consensus — give them appropriate benefit of the doubt.

Candidates:
${JSON.stringify(candidates.map(c => ({
  title: c.title, category: c.category,
  sourcePriceUSD: c.sourcePriceUSD, salePriceUSD: c.salePriceUSD,
  scores: c.scores, evidenceBasis: c.evidenceBasis,
  indiaManufacturing: c.indiaManufacturing,
  agreedByProviders: c.providerCount,
})), null, 2)}

For EACH output:
{
  "title": "<exact title from input>",
  "validationScore": <0-100 realism/plausibility>,
  "adjustedConfidence": <50-95 user-facing confidence %>,
  "flags": ["concern if any — empty array if clean"],
  "verdict": "pass|reject"
}

Pass ≤8 total. Prefer diverse categories. Reject: implausible price spreads, India can't make it, inflated scores.
Return JSON array only.`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body        = await req.json().catch(() => ({}));
    const marketplace = (body.marketplace || 'amazon_us') as string;
    const focus: FocusHints = {};
    if (body.category)      focus.category      = String(body.category).slice(0, 200).trim();
    if (body.trendStrength) focus.trendStrength  = String(body.trendStrength).trim();
    if (body.trendSource)   focus.trendSource    = String(body.trendSource).trim();
    const hasFocus = !!(focus.category || focus.trendStrength || focus.trendSource);
    const userId      = getUserId(req);

    // Guest-supplied free LLM keys (Groq / Mistral only) — sent as headers by the browser
    const guestKeys: Record<string, string> = {};
    const hGroq    = req.headers.get('x-guest-groq-key')?.trim();
    const hMistral = req.headers.get('x-guest-mistral-key')?.trim();
    if (hGroq)    guestKeys['groq']    = hGroq;
    if (hMistral) guestKeys['mistral'] = hMistral;

    const { role: userRole, plan: userPlan } = getTokenPayload(req);

    const db = getDb();
    await ensureSchema(db);

    // Quota: free authenticated users are limited to 5 searches total
    const FREE_LIMIT = 5;
    if (userId && userRole !== 'admin' && userPlan !== 'pro') {
      const countRes = await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM "Search" WHERE userId = ?',
        args: [userId],
      });
      const used = Number((countRes.rows[0] as any)?.cnt ?? 0);
      if (used >= FREE_LIMIT) {
        return NextResponse.json({
          error: `Free plan limit reached (${FREE_LIMIT} searches). Upgrade to Pro for unlimited searches.`,
          limitReached: true,
          used,
          limit: FREE_LIMIT,
        }, { status: 429 });
      }
    }

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

    // Pro users can use all AI providers; free/guest are restricted to Groq + Mistral only
    const freeOnly = userRole !== 'admin' && userPlan !== 'pro';

    // ── Stage 1: Parallel multi-provider discovery ────────────────────────────
    const discMsgs = [
      { role: 'system' as const, content: 'Return only valid JSON arrays. No markdown, no explanation.' },
      { role: 'user'   as const, content: hasFocus ? contextualDiscoveryPrompt(mpName, today, month, year, focus) : discoveryPrompt(mpName, today, month, year) },
    ];

    let providerResults: Array<{ provider: Provider; result: AiCandidate[] }> = [];
    try {
      providerResults = await callAllProviders<AiCandidate[]>(discMsgs, { maxTokens: 3000, guestKeys, freeOnly });
    } catch (err) {
      await db.execute({ sql: `UPDATE "Search" SET status='failed', errorMessage=?, updatedAt=? WHERE id=?`, args: [String(err).slice(0, 400), Date.now(), searchId] });
      return NextResponse.json({ error: String(err), searchId }, { status: 502 });
    }

    if (providerResults.length === 0) {
      await db.execute({ sql: `UPDATE "Search" SET status='failed', errorMessage='All AI providers failed', updatedAt=? WHERE id=?`, args: [Date.now(), searchId] });
      return NextResponse.json({ error: 'No AI providers responded — set GROQ_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY', searchId }, { status: 502 });
    }

    // ── Stage 2: Merge + consensus scoring ────────────────────────────────────
    const merged = mergeProviderResults(providerResults);
    merged.sort((a, b) => b.providerCount - a.providerCount || b.avgQuality - a.avgQuality);
    const top24 = merged.slice(0, 24);

    // ── Stage 3: Cross-model validation ───────────────────────────────────────
    const valMsgs = [
      { role: 'system' as const, content: 'Return only valid JSON arrays. No markdown, no explanation.' },
      { role: 'user'   as const, content: validationPrompt(mpName, month, year, top24) },
    ];

    let verdicts: ValidationVerdict[] = [];
    let validatorName = 'conservative-fallback';

    const valResult = await callBestValidator<ValidationVerdict[]>(
      providerResults.map(r => r.provider.id),
      valMsgs,
      { maxTokens: 2000, guestKeys, freeOnly },
    );

    if (valResult && Array.isArray(valResult.result)) {
      verdicts      = valResult.result;
      validatorName = valResult.provider.name;
    } else {
      verdicts = top24.map(c => ({
        title: c.title, validationScore: 60, adjustedConfidence: 62,
        flags: ['Validation unavailable — conservative defaults applied'], verdict: 'pass' as const,
      }));
    }

    // ── Stage 4: Final selection ──────────────────────────────────────────────
    const verdictMap = new Map(verdicts.map(v => [v.title.toLowerCase().trim(), v]));
    const finalList  = top24
      .map(c => {
        const v = verdictMap.get(c.title.toLowerCase().trim()) ?? {
          validationScore: 55, adjustedConfidence: 60, flags: [], verdict: 'pass' as const,
        };
        return { ...c, verdict: v, finalConfidence: consensusConfidence(c, v.validationScore) };
      })
      .filter(c => c.verdict.verdict !== 'reject' && c.verdict.validationScore >= 50)
      .sort((a, b) => b.finalConfidence - a.finalConfidence || b.providerCount - a.providerCount)
      .slice(0, 8);

    // ── Persist to DB ─────────────────────────────────────────────────────────
    const mpRow = await db.execute({ sql: `SELECT id FROM "Marketplace" WHERE code=? LIMIT 1`, args: [marketplace] });
    const marketplaceId = mpRow.rows[0]?.id as string ?? '';

    let count = 0;
    for (const c of finalList) {
      if (!c.title) continue;

      // Skip if same product title already exists for this marketplace across any prior search
      const normTitle = c.title.toLowerCase().trim();
      const dupCheck = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM "Product" p JOIN "Opportunity" o ON p.id = o.productId WHERE o.marketplaceId = ? AND lower(trim(p.title)) = ?`,
        args: [marketplaceId, normTitle],
      });
      if (Number((dupCheck.rows[0] as any)?.cnt ?? 0) > 0) continue;

      const productId     = crypto.randomUUID();
      const opportunityId = crypto.randomUUID();
      const ts            = Date.now();
      const oScore        = oppScore(c.scores);
      const rec           = recommend(oScore, c.scores.margin);

      const srcMinor  = Math.round((c.sourcePriceUSD ?? 10) * 100);
      const saleMinor = Math.round((c.salePriceUSD  ?? 30) * 100);
      const feeMinor  = Math.round(saleMinor * 0.15);
      const overhead  = Math.round(srcMinor * 0.30);
      const landed    = srcMinor + overhead;
      const net       = saleMinor - landed - feeMinor;
      const margin    = saleMinor > 0 ? (net / saleMinor) * 100 : 0;
      const roi       = srcMinor  > 0 ? (net / srcMinor)  * 100 : 0;

      const imgUrl = await productImageUrl(productId, c.title, c.category ?? '');

      const desc = [
        c.description ?? '',
        `Evidence: ${c.evidenceBasis ?? 'Multi-model market analysis'}`,
        c.providerCount > 1 ? `Consensus: ${c.providerNames.join(' + ')}` : '',
        c.verdict.flags.length ? `Note: ${c.verdict.flags.join('; ')}` : '',
      ].filter(Boolean).join(' | ').slice(0, 1000);

      await db.execute({ sql: `INSERT INTO "Product" (id, title, category, description, imageUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [productId, c.title.slice(0, 200), (c.category ?? '').slice(0, 100), desc, imgUrl, ts, ts] });
      await db.execute({ sql: `INSERT INTO "Opportunity" (id, searchId, productId, marketplaceId, status, recommendation, confidence, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'scored', ?, ?, ?, ?)`, args: [opportunityId, searchId, productId, marketplaceId, rec, c.finalConfidence, ts, ts] });
      await db.execute({ sql: `INSERT INTO "Score" (id, opportunityId, opportunity, demand, competition, margin, trend, shipping, marketplaceFit, saturation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [crypto.randomUUID(), opportunityId, oScore, c.scores.demand, c.scores.competition, c.scores.margin, c.scores.trend, c.scores.shipping, c.scores.marketplaceFit, c.scores.saturation, ts, ts] });
      await db.execute({ sql: `INSERT INTO "ProfitModel" (id, opportunityId, productCostMinor, salePriceMinor, landedCostMinor, marketplaceFeesMinor, grossProfitMinor, netProfitMinor, netMarginPct, roiPct, currency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?)`, args: [crypto.randomUUID(), opportunityId, srcMinor, saleMinor, landed, feeMinor, saleMinor - landed, net, Math.round(margin * 10) / 10, Math.round(roi * 10) / 10, ts, ts] });

      // 10 competitive sourcing candidates — India first (5), then global alternatives (5)
      const city1 = supplierCity(c.category);
      const altCities = Object.values(CITY_MAP).flat().filter(ci => ci !== city1);
      const city2 = altCities[(c.title.length + 7)  % altCities.length] || 'Mumbai';
      const city3 = altCities[(c.title.length + 13) % altCities.length] || 'Chennai';
      const city4 = altCities[(c.title.length + 19) % altCities.length] || 'Kolkata';
      const coords1 = INDIAN_CITY_COORDS[city1] ?? [28.6139, 77.2090];
      const coords2 = INDIAN_CITY_COORDS[city2] ?? [19.0760, 72.8777];
      const coords3 = INDIAN_CITY_COORDS[city3] ?? [13.0827, 80.2707];
      const coords4 = INDIAN_CITY_COORDS[city4] ?? [22.5726, 88.3639];
      const kw  = c.title.split(' ').slice(0, 2).join(' ');
      const kw3 = c.title.split(' ').slice(0, 3).join(' ');
      const enc50 = encodeURIComponent(c.title.slice(0, 50));
      const enc40 = encodeURIComponent(c.title.slice(0, 40));
      const easeFeas = (c.indiaManufacturing === 'easy' ? 'easy' : 'moderate') as 'easy' | 'moderate';
      const cands = [
        // ─ India (5 platforms — India-first sourcing advantage) ──────────────
        { name: supplierName(c.title, c.category, 0), source: 'indiamart',
          url: `https://www.indiamart.com/search.mp?ss=${enc50}`,
          pct: 1.00, moq: 50,  lead: 21, feas: easeFeas,
          city: city1, country: 'India', lat: coords1[0], lon: coords1[1], rating: 4.4, verified: 1 },
        { name: supplierName(c.title, c.category, 3), source: 'tradeindia',
          url: `https://www.tradeindia.com/search/${enc50}/`,
          pct: 1.06, moq: 100, lead: 26, feas: 'moderate' as const,
          city: city2, country: 'India', lat: coords2[0], lon: coords2[1], rating: 4.0, verified: 0 },
        { name: supplierName(c.title, c.category, 4), source: 'gem',
          url: `https://mkp.gem.gov.in/search?search=${enc50}`,
          pct: 0.96, moq: 30,  lead: 18, feas: (c.indiaManufacturing === 'hard' ? 'moderate' : 'easy') as 'easy' | 'moderate',
          city: city3, country: 'India', lat: coords3[0], lon: coords3[1], rating: 4.5, verified: 1 },
        { name: supplierName(c.title, c.category, 2), source: 'exporthub',
          url: `https://www.exporthub.com/india-suppliers/?product=${enc50}`,
          pct: 1.04, moq: 75,  lead: 24, feas: 'moderate' as const,
          city: city4, country: 'India', lat: coords4[0], lon: coords4[1], rating: 3.9, verified: 0 },
        { name: supplierName(c.title, c.category, 1), source: 'udaan',
          url: `https://udaan.com/search/results?q=${enc50}`,
          pct: 1.02, moq: 25,  lead: 16, feas: 'easy' as const,
          city: city1, country: 'India', lat: coords1[0], lon: coords1[1], rating: 4.1, verified: 0 },
        // ─ Global alternatives (5 platforms — competitive benchmarks) ────────
        { name: `${kw3} Global Manufacturing Co., Ltd`, source: 'alibaba',
          url: `https://www.alibaba.com/trade/search?SearchText=${enc40}`,
          pct: 0.80, moq: 100, lead: 35, feas: 'easy' as const,
          city: 'Guangzhou', country: 'China', lat: 23.13, lon: 113.26, rating: 4.6, verified: 1 },
        { name: `${kw} Direct Wholesale`, source: 'dhgate',
          url: `https://www.dhgate.com/wholesale/search.do?act=search&searchkey=${enc40}`,
          pct: 0.72, moq: 20,  lead: 28, feas: 'easy' as const,
          city: 'Yiwu', country: 'China', lat: 29.31, lon: 120.06, rating: 3.9, verified: 0 },
        { name: `Global ${kw} Exports Ltd`, source: 'globalsources',
          url: `https://www.globalsources.com/gsol/I/Search?keyword=${enc40}`,
          pct: 0.85, moq: 200, lead: 38, feas: 'moderate' as const,
          city: 'Hong Kong', country: 'Hong Kong', lat: 22.32, lon: 114.17, rating: 4.3, verified: 1 },
        { name: `${kw3} Industrial Co., Ltd`, source: 'made-in-china',
          url: `https://www.made-in-china.com/multi-search/${enc40}/F0/`,
          pct: 0.76, moq: 50,  lead: 32, feas: 'easy' as const,
          city: 'Shenzhen', country: 'China', lat: 22.54, lon: 114.06, rating: 4.1, verified: 0 },
        { name: `${kw} EC21 Verified Supplier`, source: 'ec21',
          url: `https://www.ec21.com/search/?q=${enc40}`,
          pct: 0.83, moq: 150, lead: 40, feas: 'moderate' as const,
          city: 'Ningbo', country: 'China', lat: 29.86, lon: 121.55, rating: 4.0, verified: 1 },
      ];
      for (const s of cands) {
        const scId = crypto.randomUUID();
        await db.execute({ sql: `INSERT INTO "SourcingCandidate" (id, supplierId, opportunityId, supplierName, source, sourceUrl, productCostMinor, moq, leadTimeDays, feasibility, city, country, latitude, longitude, rating, verifiedBadge, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [scId, scId, opportunityId, s.name, s.source, s.url, Math.round(srcMinor * s.pct), s.moq, s.lead, s.feas, s.city, s.country, s.lat, s.lon, s.rating, s.verified, ts, ts] });
      }

      count++;
    }

    const doneTs = Date.now();
    await db.execute({ sql: `UPDATE "Search" SET status='complete', opportunityCount=?, completedAt=?, updatedAt=? WHERE id=?`, args: [count, doneTs, doneTs, searchId] });

    return NextResponse.json({
      searchId, status: 'complete', count,
      pipeline: {
        discovery:  `${providerResults.length} providers → ${merged.length} unique candidates`,
        consensus:  `${merged.filter(m => m.providerCount > 1).length} multi-provider agreements`,
        validation: `Validated by ${validatorName}`,
        saved:      `${count}/${top24.length} passed`,
      },
      providers: {
        discovery: providerResults.map(r => ({ name: r.provider.name, count: Array.isArray(r.result) ? r.result.length : 0 })),
        validator: validatorName,
      },
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
