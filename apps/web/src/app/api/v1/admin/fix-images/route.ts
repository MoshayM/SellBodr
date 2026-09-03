import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { fetchProductImage } from '@/lib/imageEnrichment';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// GET /api/v1/admin/fix-images?secret=<ADMIN_SECRET>
// GET /api/v1/admin/fix-images?secret=<ADMIN_SECRET>&debug=1   — list all products
// GET /api/v1/admin/fix-images?secret=<ADMIN_SECRET>&pending=1 — list products still needing enrichment
// GET /api/v1/admin/fix-images?secret=<ADMIN_SECRET>&force=1   — re-enrich ALL products
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const validSecret = process.env.ADMIN_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!validSecret || secret !== validSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  await ensureSchema(db);

  if (req.nextUrl.searchParams.get('debug') === '1') {
    const all = await db.execute(
      `SELECT p.id, p.title, p.imageUrl, p.imageSource, p.imageSourceUrl
       FROM "Product" p ORDER BY p.createdAt DESC LIMIT 100`
    );
    return NextResponse.json({ count: all.rows.length, products: all.rows });
  }

  const force  = req.nextUrl.searchParams.get('force')  === '1';
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit')  ?? '5', 10), 20);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10);

  const whereClause = force
    ? `WHERE 1=1`
    : `WHERE (p.imageSource IS NULL OR p.imageSource = '' OR p.imageSource NOT IN ('amazon','etsy','ebay'))`;

  // &pending=1 — list the products still needing enrichment (no writes)
  if (req.nextUrl.searchParams.get('pending') === '1') {
    const rows = await db.execute(
      `SELECT p.id, p.title, p.category, p.imageSource, m.code as marketplace
       FROM "Product" p
       JOIN "Opportunity" o ON o.productId = p.id
       JOIN "Marketplace" m ON o.marketplaceId = m.id
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.createdAt DESC
       LIMIT 50`
    );
    return NextResponse.json({ count: rows.rows.length, pending: rows.rows });
  }

  const result = await db.execute(
    `SELECT p.id, p.title, p.category, p.imageSource, m.code as marketplace
     FROM "Product" p
     JOIN "Opportunity" o ON o.productId = p.id
     JOIN "Marketplace" m ON o.marketplaceId = m.id
     ${whereClause}
     GROUP BY p.id
     ORDER BY p.createdAt DESC
     LIMIT ${limit} OFFSET ${offset}`
  );

  let fixed = 0;
  let failed = 0;
  const details: any[] = [];
  const now = Date.now();

  for (const row of result.rows) {
    const title      = String(row.title      || '');
    const category   = String(row.category   || '');
    const marketplace = String(row.marketplace || 'amazon_us');

    try {
      const enriched = await fetchProductImage(title, category, marketplace);
      if (!enriched) {
        failed++;
        details.push({ title: title.slice(0, 50), marketplace, result: 'null — all sources failed' });
        continue;
      }

      await db.execute({
        sql: `UPDATE "Product"
              SET imageUrl = ?, imageSource = ?, imageConfidence = ?, imageSourceUrl = ?, updatedAt = ?
              WHERE id = ?`,
        args: [enriched.url, enriched.source, enriched.confidence, enriched.sourceUrl ?? '', now, row.id as string],
      });
      fixed++;
      details.push({ title: title.slice(0, 50), marketplace, result: enriched.source, url: enriched.url.slice(0, 60) });
    } catch (e: any) {
      failed++;
      details.push({ title: title.slice(0, 50), marketplace, result: `error: ${String(e?.message ?? e)}` });
    }
  }

  const countRow = await db.execute(
    `SELECT COUNT(DISTINCT p.id) as cnt
     FROM "Product" p
     JOIN "Opportunity" o ON o.productId = p.id
     JOIN "Marketplace" m ON o.marketplaceId = m.id
     ${whereClause}`
  );
  const totalRemaining = Number((countRow.rows[0] as any)?.cnt ?? 0);

  return NextResponse.json({ fixed, failed, processed: result.rows.length, offset, limit, totalRemaining, details });
}
