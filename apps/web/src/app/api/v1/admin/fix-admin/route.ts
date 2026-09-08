import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// One-time endpoint: elevates the hardcoded admin email to role=admin, plan=pro
// Protected by ADMIN_SECRET env var
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
    return NextResponse.json({ message: `No user found with email ${adminEmail}` }, { status: 404 });
  }

  const now = Date.now();
  await db.execute({
    sql: 'UPDATE "User" SET role = ?, plan = ?, updatedAt = ? WHERE email = ?',
    args: ['admin', 'pro', now, adminEmail],
  });

  await db.execute({
    sql: `INSERT INTO "AuditLog" (id, actorUserId, action, resourceType, resourceId, createdAt) VALUES (?,?,?,?,?,?)`,
    args: [uuidv4(), existing.rows[0].id as string, 'admin.fix-admin', 'user', existing.rows[0].id as string, now],
  });

  return NextResponse.json({ ok: true, email: adminEmail, role: 'admin', plan: 'pro' });
}
