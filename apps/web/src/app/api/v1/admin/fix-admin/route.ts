import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = 'sellbodr@gmail.com';
  const db = getDb();
  await ensureSchema(db);

  const existing = await db.execute({
    sql: 'SELECT id, role, plan FROM "User" WHERE email = ?',
    args: [adminEmail],
  });

  if (!existing.rows.length) {
    return NextResponse.json({ message: `No user found: ${adminEmail}` }, { status: 404 });
  }

  const row = existing.rows[0] as any;
  const now = Date.now();

  await db.execute({
    sql: 'UPDATE "User" SET role = ?, plan = ?, updatedAt = ? WHERE email = ?',
    args: ['admin', 'pro', now, adminEmail],
  });

  return NextResponse.json({
    ok: true,
    email: adminEmail,
    before: { role: row.role, plan: row.plan },
    after: { role: 'admin', plan: 'pro' },
  });
}
