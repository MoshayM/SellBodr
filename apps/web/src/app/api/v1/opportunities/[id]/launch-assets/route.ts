import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { checkAndDeductCredit } from '@/lib/credits';
import { PROVIDERS, FREE_PROVIDER_IDS, tryProvider } from '@/lib/ai/gateway';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
);

function staticAssets(title: string, category: string, mkt: string) {
  const cat = category.replace(/_/g, ' ') || 'product';
  const kw = `${title} ${cat}`.toLowerCase();
  return {
    seoTitle: `${title} — Premium ${cat} | Handcrafted in India | ${mkt}`,
    bullets: [
      `AUTHENTIC INDIAN CRAFTSMANSHIP — Each ${cat} is handcrafted by skilled Indian artisans using traditional techniques passed down through generations`,
      `SUPERIOR QUALITY MATERIALS — Made with premium, export-grade materials sourced from India's finest suppliers for lasting durability`,
      `PERFECT GIFT IDEA — Beautifully packaged, ideal for birthdays, anniversaries, or any special occasion — ready to gift straight from the box`,
      `GLOBAL SHIPPING READY — Carefully packed to survive international transit; arrives in perfect condition at your door`,
      `100% SATISFACTION GUARANTEED — We stand behind every product with hassle-free returns and responsive customer support`,
    ],
    description: `Discover the beauty of authentic Indian craftsmanship with our premium ${cat}. Each piece is lovingly handmade by skilled artisans in India, combining centuries-old techniques with modern quality standards.\n\nWhat sets our ${cat} apart is the attention to detail and the quality of materials used. We work directly with India's finest craftspeople to bring you products that are both beautiful and built to last — at a price that respects your budget.\n\nOrder today and experience the difference that genuine craftsmanship makes. We ship worldwide with full tracking, and every purchase comes with our satisfaction guarantee. If you're not delighted, we'll make it right.`,
    keywords: {
      primary: [title.toLowerCase(), cat, `buy ${cat}`],
      secondary: [`india ${cat}`, `handmade ${cat}`, `${cat} gift`, `artisan ${cat}`],
      backend: [`authentic indian ${cat}`, `handcrafted ${cat}`, `${cat} online`, `premium ${cat}`, `${kw} shop`],
    },
    positioning: `A premium, India-sourced ${cat} that bridges authentic artisan craftsmanship and global e-commerce. Positioned as the quality-conscious choice for buyers who value heritage, sustainability, and value — sitting between mass-market and luxury pricing.`,
  };
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    } catch { }
  }

  if (!isAdminUser && !userId) {
    return NextResponse.json({ error: 'Sign in to generate listing assets', code: 'auth_required' }, { status: 401 });
  }

  try {
    const db = getDb();
    await ensureSchema(db);

    if (!isAdminUser) {
      const cr = await checkAndDeductCredit(userId, 'listing', db);
      if (!cr.ok) {
        return NextResponse.json(
          { error: 'No credits remaining. Buy 10 credits for $5.', code: 'no_credits' },
          { status: 402 },
        );
      }
    }

    const oppRow = await db.execute({
      sql: `
        SELECT o.id, o.recommendation, o.confidence,
          p.title as pTitle, p.category as pCategory, p.description as pDesc,
          m.code as mCode, m.country as mCountry, m.currency as mCurrency
        FROM "Opportunity" o
        LEFT JOIN "Product" p     ON o.productId     = p.id
        LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
        WHERE o.id = ? LIMIT 1
      `,
      args: [params.id],
    });

    const opp = oppRow.rows[0];
    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const title    = String(opp.pTitle    || '');
    const category = String(opp.pCategory || '').replace(/_/g, ' ');
    const mpName   = String(opp.mCode || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const country  = String(opp.mCountry || 'us').toUpperCase();

    const available = PROVIDERS.filter(p =>
      p.available() && (FREE_PROVIDER_IDS as readonly string[]).includes(p.id)
    );

    let result: any = null;
    if (available.length) {
      const best = available.sort((a, b) => b.quality - a.quality)[0];
      const res = await tryProvider<any>(best, best.validationModel, [
        { role: 'system', content: 'You are a professional marketplace listing copywriter. Return valid JSON only. No markdown.' },
        { role: 'user', content: `Generate SEO-optimised listing assets for this India-sourced product.
Product: ${title}
Category: ${category}
Marketplace: ${mpName} (${country})
Return JSON exactly:
{"seoTitle":"...","bullets":["...","...","...","...","..."],"description":"3 paragraphs","keywords":{"primary":["...","...","..."],"secondary":["...","...","...","..."],"backend":["...","...","...","...","..."]},"positioning":"..."}` },
      ], { maxTokens: 1400 });
      result = res?.result ?? null;
    }

    if (!result) result = staticAssets(title, category, mpName);

    const ts = Date.now();
    const listingId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT OR REPLACE INTO "ListingAsset"
              (id, opportunityId, seoTitle, bullets, description, keywords, positioning, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        listingId, params.id,
        String(result.seoTitle || '').slice(0, 250),
        JSON.stringify(Array.isArray(result.bullets) ? result.bullets : []),
        String(result.description || ''),
        JSON.stringify(result.keywords || {}),
        String(result.positioning || ''),
        ts, ts,
      ],
    });

    const stored = await db.execute({
      sql: `SELECT * FROM "ListingAsset" WHERE opportunityId = ? LIMIT 1`,
      args: [params.id],
    });

    return NextResponse.json(stored.rows[0]);
  } catch (err: any) {
    console.error('launch-assets error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
