import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { hash } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
);

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    await ensureSchema(db);

    const authHeader = req.headers.get('authorization')?.split(' ')[1];
    if (!authHeader) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let userId: string;
    try {
      const { payload } = await jwtVerify(authHeader, ACCESS_SECRET);
      userId = String(payload.sub);
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pin  = String(body.pin ?? '');
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ message: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const pinHash = await hash(pin, 10);
    await db.execute({
      sql: 'UPDATE "User" SET pinHash = ?, pinAttempts = 0, pinLockedUntil = NULL, updatedAt = ? WHERE id = ?',
      args: [pinHash, Date.now(), userId],
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('pin/set error:', err);
    return NextResponse.json({ message: 'Failed to set PIN' }, { status: 500 });
  }
}
