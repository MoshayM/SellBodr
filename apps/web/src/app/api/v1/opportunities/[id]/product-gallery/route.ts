import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { fetchProductImages } from '@/lib/imageEnrichment';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT p.title, p.category, m.code as marketplace
            FROM "Opportunity" o
            JOIN "Product" p ON o.productId = p.id
            JOIN "Marketplace" m ON o.marketplaceId = m.id
            WHERE o.id = ? LIMIT 1`,
      args: [params.id],
    });

    if (!r.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { title, category, marketplace } = r.rows[0] as any;
    const images = await fetchProductImages(String(title), String(category), String(marketplace));

    return NextResponse.json({ title: String(title), category: String(category), marketplace: String(marketplace), images });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
