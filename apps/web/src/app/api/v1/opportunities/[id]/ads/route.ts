import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { PROVIDERS, FREE_PROVIDER_IDS, tryProvider } from '@/lib/ai/gateway';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

function staticAds(title: string, category: string, mkt: string, country: string) {
  const prod = title || 'this amazing product';
  const cat = category?.replace(/_/g, ' ') || 'product';
  return {
    facebook: {
      headline: `Discover Premium ${prod} — Direct from India`,
      primaryText: `✨ Authentic ${cat} crafted by skilled artisans. Premium quality sourced directly from India's finest manufacturers — now available on ${mkt}.\n\n🔹 Export-grade quality\n🔹 Handcrafted with care\n🔹 Unbeatable price-to-quality ratio\n\nLimited stock available. Order now before it sells out!`,
      cta: 'Shop Now',
      audience: `People interested in ${cat}, handmade goods, home decor. Age 25–45. ${country} residents. Interest in quality lifestyle products.`,
      dailyBudget: '$15–25/day recommended for initial launch',
    },
    instagram: {
      caption: `✨ Meet your new favourite ${cat}! Handcrafted in India 🇮🇳, delivered to your door. Quality you can feel. Link in bio to shop now! 🛒`,
      hashtags: [`#${cat.replace(/\s/g, '')}`, '#MadeInIndia', '#HandcraftedLove', '#QualityFirst', '#ShopNow', `#${mkt.replace(/\s/g, '')}`],
      storyText: `Swipe up to discover this amazing ${cat} ⬆️\nLimited stock!\n🇮🇳 Sourced from India's best`,
      reelHook: `POV: You finally found the perfect ${cat} and it ships in 5 days 📦`,
    },
    youtube: {
      title: `This ${cat} Changed Everything — Premium Quality from India | ${mkt}`,
      hook: `In the next 30 seconds, I'll show you why this ${cat} is unlike anything you've seen on ${mkt}...`,
      body: `We spent months sourcing directly from India's best manufacturers to bring you this incredible ${cat}. The craftsmanship is exceptional, the price is unbeatable, and the quality speaks for itself. Here's what makes it special...`,
      cta: `Click the link in the description to get yours now before stock runs out. We only have limited units available at this launch price.`,
      description: `🛒 Shop now: [link]\n\nWe source directly from Indian manufacturers to bring you the best ${cat} at unbeatable prices. This video shows our full review and why we recommend it for buyers on ${mkt}.\n\n#${cat.replace(/\s/g, '')} #MadeInIndia #${mkt.replace(/\s/g, '')}`,
      audienceTargeting: `Custom audience: buyers of similar ${cat} products. Lookalike from buyers list. Interests: ${cat}, home improvement, quality goods.`,
    },
    google: {
      headline1: `Premium ${prod}`,
      headline2: `Shipped Fast to ${country}`,
      headline3: 'Direct from India',
      description1: `High-quality ${cat} sourced from India's top manufacturers. Export grade. Fast delivery.`,
      description2: `Shop authentic ${cat} at competitive prices. Trusted by global buyers. Order now.`,
      keywords: [prod, cat, `buy ${cat}`, `${cat} ${country}`, `india ${cat}`, `${cat} online`, `handmade ${cat}`],
      bidStrategy: 'Target CPA $8–15 recommended for initial campaign',
    },
    tips: [
      'Start with $15/day Facebook budget targeting lookalike audiences from your existing buyer list.',
      `Use UGC-style videos showing the ${cat} in real use — these outperform polished ads 3:1.`,
      'Run retargeting ads to product page visitors within 7 days — conversion rate 5× higher.',
      'A/B test "India crafted quality" angle vs. "Fast delivery + great price" — measure CTR.',
      'YouTube pre-roll works best for category searches. Target competitor product names.',
    ],
  };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Auth is optional — expired/missing token falls back to free-tier, never 500s
    let freeOnly = true;
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (token) {
      try {
        const { payload } = await jwtVerify(token, ACCESS_SECRET);
        freeOnly = payload.role !== 'admin' && payload.plan !== 'pro';
      } catch { /* invalid/expired token — treat as free guest */ }
    }

    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT o.*, p.title, p.category, m.code as mCode, m.country as mCountry,
              s.opportunity as oppScore, s.margin as marginScore
            FROM "Opportunity" o
            LEFT JOIN "Product" p ON o.productId = p.id
            LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
            LEFT JOIN "Score" s ON s.opportunityId = o.id
            WHERE o.id = ?`,
      args: [params.id],
    });

    if (!r.rows.length) return NextResponse.json({ message: 'Opportunity not found' }, { status: 404 });
    const opp = r.rows[0] as any;

    const title = String(opp.title || '');
    const category = String(opp.category || '');
    const mkt = String(opp.mCode || '').replace(/_/g, ' ').toUpperCase();
    const country = String(opp.mCountry || '').toUpperCase();

    // Check if cached
    const cached = await db.execute({
      sql: 'SELECT content, updatedAt FROM "AdCampaignDraft" WHERE opportunityId = ? ORDER BY createdAt DESC LIMIT 1',
      args: [params.id],
    });
    if (cached.rows.length) {
      const age = Date.now() - Number((cached.rows[0] as any).updatedAt || 0);
      if (age < 24 * 60 * 60 * 1000) {
        return NextResponse.json(JSON.parse(String((cached.rows[0] as any).content)));
      }
    }

    const available = PROVIDERS.filter(p =>
      p.available() && (!freeOnly || (FREE_PROVIDER_IDS as readonly string[]).includes(p.id))
    );
    if (!available.length) {
      return NextResponse.json(staticAds(title, category, mkt, country));
    }

    const best = available.sort((a, b) => b.quality - a.quality)[0];
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a senior performance marketing strategist specializing in cross-border eCommerce. Generate highly converting ad content. Return ONLY valid JSON.',
      },
      {
        role: 'user' as const,
        content: `Create ad campaign content for:
Product: ${title}
Category: ${category}
Marketplace: ${mkt} (${country})
Opportunity Score: ${Math.round(Number(opp.oppScore) || 0)}/100
Recommendation: ${opp.recommendation || 'hold'}

Return JSON exactly:
{
  "facebook": {"headline":"...","primaryText":"...","cta":"...","audience":"...","dailyBudget":"..."},
  "instagram": {"caption":"...","hashtags":[...],"storyText":"...","reelHook":"..."},
  "youtube": {"title":"...","hook":"...","body":"...","cta":"...","description":"...","audienceTargeting":"..."},
  "google": {"headline1":"...","headline2":"...","headline3":"...","description1":"...","description2":"...","keywords":[...],"bidStrategy":"..."},
  "tips": ["tip1","tip2","tip3","tip4","tip5"]
}
Make content specific, conversion-focused, and platform-native. Avoid generic marketing speak.`,
      },
    ];

    const result = await tryProvider<any>(best, best.discoveryModel, messages, { maxTokens: 1200 });
    const content = result?.result ?? staticAds(title, category, mkt, country);

    // Cache result
    const now = Date.now();
    if (cached.rows.length) {
      await db.execute({
        sql: 'UPDATE "AdCampaignDraft" SET content=?, updatedAt=? WHERE opportunityId=?',
        args: [JSON.stringify(content), now, params.id],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO "AdCampaignDraft" (id, opportunityId, content, createdAt, updatedAt) VALUES (?,?,?,?,?)',
        args: [uuidv4(), params.id, JSON.stringify(content), now, now],
      });
    }

    return NextResponse.json(content);
  } catch (err: any) {
    console.error('Ads generation error:', err);
    return NextResponse.json({ message: 'Ad generation failed' }, { status: 500 });
  }
}
