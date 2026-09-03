import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
);

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ credits: 0, isAdmin: false });
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (payload.role === 'admin') {
      return NextResponse.json({ credits: null, isAdmin: true }); // null = unlimited
    }
    const userId = String(payload.sub ?? '');
    if (!userId) return NextResponse.json({ credits: 0, isAdmin: false });
    const db = getDb();
    await ensureSchema(db);
    const r = await db.execute({ sql: `SELECT credits FROM "User" WHERE id = ?`, args: [userId] });
    const credits = Number((r.rows[0] as any)?.credits ?? 0);
    return NextResponse.json({ credits, isAdmin: false });
  } catch {
    return NextResponse.json({ credits: 0, isAdmin: false });
  }
}
