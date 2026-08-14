import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')?.split(' ')[1];
  if (!auth) return null;
  try {
    const { payload } = await jwtVerify(auth, ACCESS_SECRET);
    return String(payload.sub);
  } catch { return null; }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 64) : null;
  if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

  const db = getDb();
  await ensureSchema(db);

  const res = await db.execute({
    sql: 'UPDATE "Passkey" SET name = ? WHERE id = ? AND userId = ?',
    args: [name, params.id, userId],
  });

  if (res.rowsAffected === 0) return NextResponse.json({ message: 'Passkey not found' }, { status: 404 });
  return NextResponse.json({ success: true, name });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  await ensureSchema(db);

  // Safety check — don't allow deleting last passkey if user has no password
  const userRes = await db.execute({ sql: 'SELECT passwordHash FROM "User" WHERE id = ?', args: [userId] });
  const user = userRes.rows[0];
  if (user && String(user.passwordHash) === 'PASSKEY_ONLY') {
    const countRes = await db.execute({ sql: 'SELECT COUNT(*) as c FROM "Passkey" WHERE userId = ?', args: [userId] });
    const count = Number((countRes.rows[0] as any)?.c ?? 0);
    if (count <= 1) {
      return NextResponse.json({ message: 'Cannot delete your only passkey — set a password first' }, { status: 400 });
    }
  }

  const res = await db.execute({
    sql: 'DELETE FROM "Passkey" WHERE id = ? AND userId = ?',
    args: [params.id, userId],
  });

  if (res.rowsAffected === 0) return NextResponse.json({ message: 'Passkey not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
