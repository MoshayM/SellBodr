import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { ACCESS_SECRET } from '@/lib/auth-secrets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(auth, ACCESS_SECRET);
    const userId = payload.sub as string;

    const db = getDb();
    await ensureSchema(db);

    const now = Date.now();

    await db.execute({ sql: 'UPDATE "User" SET deletedAt = ? WHERE id = ?', args: [now, userId] });
    await db.execute({ sql: 'UPDATE "RefreshToken" SET revoked = 1 WHERE userId = ?', args: [userId] });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code?.startsWith('ERR_JW')) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('delete-account error:', err);
    return NextResponse.json({ message: 'Failed to delete account' }, { status: 500 });
  }
}
