import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT id, marketplace, status, opportunityCount, errorMessage, createdAt, completedAt FROM "Search" WHERE id=? LIMIT 1`,
      args: [params.id],
    });

    if (!r.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const row = r.rows[0];
    return NextResponse.json({
      searchId: row.id,
      marketplace: row.marketplace,
      status: row.status,
      opportunityCount: row.opportunityCount,
      error: row.errorMessage ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
