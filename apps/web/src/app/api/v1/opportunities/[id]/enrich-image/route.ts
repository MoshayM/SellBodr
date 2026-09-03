import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { fetchProductImage, isBrokenImageUrl } from '@/lib/imageEnrichment';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MARKETPLACE_SOURCES = ['amazon', 'etsy', 'ebay'];

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT p.id as pId, p.title, p.category, p.imageUrl,
                   p.imageSource, p.imageSourceUrl, m.code as marketplace
            FROM "Opportunity" o
            JOIN "Product" p ON o.productId = p.id
            JOIN "Marketplace" m ON o.marketplaceId = m.id
            WHERE o.id = ?
            LIMIT 1`,
      args: [params.id],
    });

    if (!r.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { pId, title, category, imageUrl: existing, imageSource, imageSourceUrl, marketplace } = r.rows[0] as any;

    // Skip only if already enriched from a real marketplace scrape
    const alreadyEnriched = !isBrokenImageUrl(existing) && MARKETPLACE_SOURCES.includes(String(imageSource ?? ''));
    if (alreadyEnriched) {
      return NextResponse.json({
        imageUrl: String(existing),
        sourceUrl: String(imageSourceUrl ?? ''),
        enriched: false,
      });
    }

    const result = await fetchProductImage(String(title), String(category), String(marketplace));
    if (!result) {
      return NextResponse.json({ imageUrl: existing ?? null, sourceUrl: '', enriched: false });
    }

    await db.execute({
      sql: `UPDATE "Product" SET imageUrl = ?, imageSource = ?, imageConfidence = ?, imageSourceUrl = ? WHERE id = ?`,
      args: [result.url, result.source, result.confidence, result.sourceUrl ?? '', pId],
    });

    return NextResponse.json({ imageUrl: result.url, sourceUrl: result.sourceUrl ?? '', enriched: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? 'unknown') }, { status: 500 });
  }
}
