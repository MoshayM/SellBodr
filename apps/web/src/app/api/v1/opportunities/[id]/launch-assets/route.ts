import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { groqJSON, MODELS } from '@/lib/ai/gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await ensureSchema(db);

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

    const mpName = String(opp.mCode).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const country = String(opp.mCountry || 'us').toUpperCase();

    const prompt = `You are a professional ${mpName} listing copywriter. Generate SEO-optimised listing assets for this India-sourced product.

Product: ${opp.pTitle}
Category: ${opp.pCategory || 'General'}
Description: ${opp.pDesc || 'Indian-manufactured product'}
Marketplace: ${mpName} (${country})
Buyer currency: ${opp.mCurrency}

Return a JSON object ONLY — no markdown, no commentary:
{
  "seoTitle": "front-load primary keyword, max 200 chars",
  "bullets": ["feature + benefit 1","feature + benefit 2","feature + benefit 3","feature + benefit 4","feature + benefit 5"],
  "description": "3 short paragraphs — hook, key features, call to action",
  "keywords": {
    "primary": ["main keyword 1","main keyword 2","main keyword 3"],
    "secondary": ["supporting kw 1","supporting kw 2","supporting kw 3","supporting kw 4"],
    "backend": ["long tail 1","long tail 2","long tail 3","long tail 4","long tail 5"]
  },
  "positioning": "one-paragraph brand story + competitive differentiation"
}`;

    const result = await groqJSON<any>(MODELS.CAPABLE, [
      { role: 'system', content: 'Return valid JSON only. No markdown fences, no explanation.' },
      { role: 'user', content: prompt },
    ], { maxTokens: 1400 });

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
