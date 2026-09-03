import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createHash } from 'crypto';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawRefresh: string | undefined = body?.refreshToken;
    if (!rawRefresh) {
      return NextResponse.json({ message: 'Refresh token required' }, { status: 400 });
    }

    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT rt.*, u.id as uid, u.role, u.plan, u.organizationId
            FROM "RefreshToken" rt
            JOIN "User" u ON u.id = rt.userId
            WHERE rt.tokenHash = ? AND rt.revoked = 0 AND rt.expiresAt > datetime('now') AND u.deletedAt IS NULL`,
      args: [tokenHash],
    });

    if (!r.rows.length) {
      return NextResponse.json({ message: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const row = r.rows[0] as any;
    const userPlan = String(row.plan || 'free');

    const accessToken = await new SignJWT({
      sub: String(row.uid),
      role: String(row.role),
      plan: userPlan,
      organizationId: String(row.organizationId || ''),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(ACCESS_SECRET);

    return NextResponse.json({ accessToken, expiresIn: 900 });
  } catch (err: any) {
    console.error('Token refresh error:', err);
    return NextResponse.json({ message: 'Token refresh failed' }, { status: 500 });
  }
}
