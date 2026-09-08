import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

import { ACCESS_SECRET } from '@/lib/auth-secrets';

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

    // Rotate: revoke consumed token, issue a fresh one
    await db.execute({
      sql: 'UPDATE "RefreshToken" SET revoked = 1 WHERE tokenHash = ?',
      args: [tokenHash],
    });
    const newRaw = randomBytes(48).toString('hex');
    const newHash = createHash('sha256').update(newRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)',
      args: [uuidv4(), String(row.uid), newHash, expiresAt, new Date().toISOString()],
    });

    return NextResponse.json({ accessToken, refreshToken: newRaw, expiresIn: 900 });
  } catch (err: any) {
    console.error('Token refresh error:', err);
    return NextResponse.json({ message: 'Token refresh failed' }, { status: 500 });
  }
}
