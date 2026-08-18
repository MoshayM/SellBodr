import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
);

export async function GET(req: NextRequest) {
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

    const res = await db.execute({
      sql: 'SELECT pinHash FROM "User" WHERE id = ?',
      args: [userId],
    });

    return NextResponse.json({ pinSet: Boolean(res.rows[0]?.pinHash) });
  } catch (err: any) {
    console.error('pin/status error:', err);
    return NextResponse.json({ message: 'Failed to check PIN status' }, { status: 500 });
  }
}
