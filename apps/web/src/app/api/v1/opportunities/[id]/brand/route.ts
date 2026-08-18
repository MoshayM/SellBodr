import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { PROVIDERS, FREE_PROVIDER_IDS, tryProvider } from '@/lib/ai/gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

function staticBrand(title: string, category: string) {
  const cat = category.replace(/_/g, ' ') || 'product';
  const word = (title.split(' ')[0] || 'Artisan');
  return {
    names: [
      { name: `${word}Grove`, meaning: `Evokes natural craftsmanship and organic quality from India's finest artisans` },
      { name: `Bharat${word}`, meaning: `Proudly Indian — "Bharat" signals authentic origin and heritage craftsmanship` },
      { name: `${word}Craft Co.`, meaning: `Clear, professional, and signals handmade quality to global buyers` },
      { name: `IndiVibe`, meaning: `Modern, global-friendly, hints at India while feeling contemporary` },
      { name: `${word}Luxe`, meaning: `Positions the product as premium — targets value-seeking quality buyers` },
    ],
    positioning: `A premium ${cat} brand sourced directly from India's most skilled artisans, delivering authentic craftsmanship at accessible prices to global marketplace buyers. Positioned between mass-market and luxury — the "quality-conscious choice" for discerning buyers who appreciate heritage and value.`,
    taglines: [
      `Crafted in India. Loved Worldwide.`,
      `Where Artisan Meets Everyday.`,
      `Real Craft. Real Value.`,
      `India's Best, Delivered to Your Door.`,
      `Handmade Heritage, Global Reach.`,
    ],
    colourPalette: {
      colours: [
        { hex: '#5B21B6', name: 'Royal Violet' },
        { hex: '#D97706', name: 'Saffron Gold' },
        { hex: '#065F46', name: 'Forest Green' },
        { hex: '#F9FAFB', name: 'Warm White' },
        { hex: '#1F2937', name: 'Deep Slate' },
      ],
      rationale: 'Violet conveys premium and trust; Saffron Gold nods to Indian heritage; Forest Green signals sustainability and natural materials.',
    },
    brandVoice: {
      tone: 'Warm, confident, and authentic — never corporate or cold',
      personality: 'The knowledgeable artisan friend who helps you buy better',
      language: 'Simple and clear; avoid jargon; celebrate craftsmanship',
      avoid: 'Overpromising, excessive superlatives, anything that feels mass-produced or impersonal',
    },
    domainIdeas: [
      `${word.toLowerCase()}grove.com`,
      `bharat${word.toLowerCase()}.com`,
      `${word.toLowerCase()}craft.co`,
      `indivibe.store`,
      `${word.toLowerCase()}luxe.shop`,
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
      sql: `SELECT p.title, p.category, m.code as mCode, m.country as mCountry
            FROM "Opportunity" o
            LEFT JOIN "Product" p ON o.productId = p.id
            LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
            WHERE o.id = ?`,
      args: [params.id],
    });
    if (!r.rows.length) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const opp = r.rows[0] as any;
    const title    = String(opp.title    || '');
    const category = String(opp.category || '').replace(/_/g, ' ');
    const mkt      = String(opp.mCode    || '').replace(/_/g, ' ').toUpperCase();

    const available = PROVIDERS.filter(p =>
      p.available() && (!freeOnly || (FREE_PROVIDER_IDS as readonly string[]).includes(p.id))
    );
    if (!available.length) return NextResponse.json(staticBrand(title, category));

    const best = available.sort((a, b) => b.quality - a.quality)[0];
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a world-class brand strategist specializing in cross-border eCommerce brands from India. Return ONLY valid JSON.',
      },
      {
        role: 'user' as const,
        content: `Create a complete brand identity for:
Product: ${title}
Category: ${category}
Marketplace: ${mkt}

Return JSON exactly:
{
  "names": [{"name":"...","meaning":"..."},{"name":"...","meaning":"..."},{"name":"...","meaning":"..."},{"name":"...","meaning":"..."},{"name":"...","meaning":"..."}],
  "positioning": "2-3 sentence brand positioning statement",
  "taglines": ["tagline1","tagline2","tagline3","tagline4","tagline5"],
  "colourPalette": {
    "colours": [{"hex":"#XXXXXX","name":"..."},{"hex":"#XXXXXX","name":"..."},{"hex":"#XXXXXX","name":"..."},{"hex":"#XXXXXX","name":"..."},{"hex":"#XXXXXX","name":"..."}],
    "rationale": "why these colours work for this brand"
  },
  "brandVoice": {
    "tone": "...",
    "personality": "...",
    "language": "...",
    "avoid": "..."
  },
  "domainIdeas": ["domain1.com","domain2.store","domain3.co","domain4.shop","domain5.com"]
}
Make everything specific to this product. Colours must be valid hex codes.`,
      },
    ];

    const result = await tryProvider<any>(best, best.discoveryModel, messages, { maxTokens: 1200 });
    return NextResponse.json(result?.result ?? staticBrand(title, category));
  } catch (err: any) {
    console.error('Brand generation error:', err);
    return NextResponse.json({ message: 'Brand generation failed' }, { status: 500 });
  }
}

