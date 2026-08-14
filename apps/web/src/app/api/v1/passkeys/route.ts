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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  await ensureSchema(db);
  const res = await db.execute({
    sql: 'SELECT id, name, deviceType, backedUp, transports, createdAt, lastUsedAt FROM "Passkey" WHERE userId = ? ORDER BY createdAt DESC',
    args: [userId],
  });

  return NextResponse.json(res.rows.map(pk => ({
    id:          pk.id,
    name:        pk.name,
    deviceType:  pk.deviceType,
    backedUp:    Boolean(pk.backedUp),
    transports:  JSON.parse(String(pk.transports || '[]')),
    createdAt:   pk.createdAt,
    lastUsedAt:  pk.lastUsedAt,
  })));
}
