import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Admin endpoint: patches all products with broken image URLs.
// GET /api/v1/admin/fix-images?secret=<ADMIN_SECRET>
// GET /api/v1/admin/fix-images?secret=<ADMIN_SECRET>&debug=1  — returns all stored imageUrls, no writes
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const validSecret = process.env.ADMIN_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!validSecret || secret !== validSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  await ensureSchema(db);

  if (req.nextUrl.searchParams.get('debug') === '1') {
    const all = await db.execute(
      `SELECT id, title, imageUrl FROM "Product" ORDER BY createdAt DESC LIMIT 50`
    );
    return NextResponse.json({
      count: all.rows.length,
      products: all.rows.map(r => ({ id: r.id, title: r.title, imageUrl: r.imageUrl })),
    });
  }

  const result = await db.execute(
    `SELECT id, title, category, imageUrl FROM "Product"
     WHERE imageUrl IS NULL OR imageUrl = ''
        OR imageUrl LIKE '%source.unsplash.com%'
        OR imageUrl LIKE '%picsum.photos%'
        OR imageUrl LIKE '%pollinations.ai%'
        OR imageUrl LIKE '%placeholder%'
        OR imageUrl LIKE '%loremflickr.com%'`
  );

  let fixed = 0;
  const now = Date.now();

  for (const row of result.rows) {
    const title    = String(row.title    || '');
    const category = String(row.category || '');

    const words = [...title.split(' ').slice(0, 3), category.replace(/_/g, ' ').split(' ')[0]]
      .filter(Boolean).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
    const seed     = words.slice(0, 3).join('-') || 'product';
    const kwQuery  = title.trim() || words.join(' ');

    let imageUrl = `https://picsum.photos/seed/${seed}/400/300`;

    const gKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
    const gCx  = process.env.GOOGLE_CSE_ID  || process.env.GOOGLE_SEARCH_ENGINE_ID;
    if (gKey && gCx) {
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${gKey}&cx=${gCx}&q=${encodeURIComponent(kwQuery + ' product')}&searchType=image&num=1&imgType=photo&imgSize=medium&safe=active&fields=items(link)`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json() as any;
          const link = data?.items?.[0]?.link;
          if (link?.startsWith('http')) imageUrl = link;
        }
      } catch { /* use picsum */ }
    }

    await db.execute({
      sql: `UPDATE "Product" SET imageUrl = ?, updatedAt = ? WHERE id = ?`,
      args: [imageUrl, now, row.id as string],
    });
    fixed++;
  }

  return NextResponse.json({ fixed, total: result.rows.length });
}
