import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// One-shot admin endpoint: patches all products that still have dead source.unsplash.com URLs.
// GET /api/v1/admin/fix-images?secret=<ADMIN_SECRET>
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const validSecret = process.env.ADMIN_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!validSecret || secret !== validSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  await ensureSchema(db);

  const result = await db.execute(
    `SELECT id, title, category FROM "Product" WHERE imageUrl LIKE '%source.unsplash.com%' OR imageUrl IS NULL OR imageUrl = ''`
  );

  let fixed = 0;
  const now = Date.now();

  for (const row of result.rows) {
    const title    = String(row.title    || '');
    const category = String(row.category || '');

    const words = [...title.split(' ').slice(0, 3), category.replace(/_/g, ' ').split(' ')[0]]
      .filter(Boolean).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
    const kwPath  = words.slice(0, 3).join(',') || 'product';
    const kwQuery = title.trim() || words.join(' ');

    let imageUrl = `https://loremflickr.com/400/300/${kwPath}`;

    // Try Google CSE first if keys available
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
      } catch { /* use loremflickr */ }
    }

    await db.execute({
      sql: `UPDATE "Product" SET imageUrl = ?, updatedAt = ? WHERE id = ?`,
      args: [imageUrl, now, row.id as string],
    });
    fixed++;
  }

  return NextResponse.json({ fixed, total: result.rows.length });
}
