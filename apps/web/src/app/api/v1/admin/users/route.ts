import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
);

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!auth) return null;
  try {
    const { payload } = await jwtVerify(auth, ACCESS_SECRET);
    return payload.role === 'admin' ? payload : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ message: 'Admin access required' }, { status: 403 });

  const db = getDb();
  await ensureSchema(db);

  const result = await db.execute(
    'SELECT id, email, name, role, plan, mfaEnabled, lastLoginAt, createdAt FROM "User" WHERE deletedAt IS NULL ORDER BY createdAt DESC'
  );

  const searchCounts = await db.execute(
    'SELECT userId, COUNT(*) as cnt FROM "Search" GROUP BY userId'
  );
  const scMap: Record<string, number> = {};
  for (const r of searchCounts.rows) {
    scMap[String(r.userId)] = Number(r.cnt);
  }

  const users = result.rows.map(u => ({
    id:           String(u.id),
    email:        String(u.email),
    name:         String(u.name || ''),
    role:         String(u.role || 'member'),
    plan:         String(u.plan || 'free'),
    mfaEnabled:   Boolean(u.mfaEnabled),
    lastLoginAt:  u.lastLoginAt ? Number(u.lastLoginAt) : null,
    createdAt:    Number(u.createdAt),
    searchCount:  scMap[String(u.id)] ?? 0,
  }));

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ message: 'Admin access required' }, { status: 403 });

  const { userId, plan, role } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ message: 'userId required' }, { status: 400 });

  const VALID_PLANS = ['free', 'pro'];
  const VALID_ROLES = ['member', 'owner', 'admin'];

  const db = getDb();
  await ensureSchema(db);

  const updates: string[] = [];
  const args: (string | number)[] = [];

  if (plan && VALID_PLANS.includes(plan)) {
    updates.push('plan = ?');
    args.push(plan);
  }
  if (role && VALID_ROLES.includes(role)) {
    updates.push('role = ?');
    args.push(role);
  }
  if (updates.length === 0) return NextResponse.json({ message: 'Nothing to update' }, { status: 400 });

  updates.push('updatedAt = ?');
  args.push(Date.now());
  args.push(userId);

  await db.execute({
    sql: `UPDATE "User" SET ${updates.join(', ')} WHERE id = ?`,
    args,
  });

  return NextResponse.json({ success: true });
}
