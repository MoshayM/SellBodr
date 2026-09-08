import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { ACCESS_SECRET } from '@/lib/auth-secrets';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const GRACE_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password)
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 });

    const db = getDb();
    await ensureSchema(db);

    const now = Date.now();
    const cutoff = now - GRACE_MS;

    const result = await db.execute({
      sql: 'SELECT * FROM "User" WHERE email = ? AND deletedAt IS NOT NULL AND deletedAt > ?',
      args: [body.email, cutoff],
    });
    const user = result.rows[0];
    if (!user) return NextResponse.json({ message: 'Account not found or 24-hour window has expired' }, { status: 404 });

    const valid = await bcrypt.compare(body.password, String(user.passwordHash));
    if (!valid) return NextResponse.json({ message: 'Invalid password' }, { status: 401 });

    await db.execute({ sql: 'UPDATE "User" SET deletedAt = NULL WHERE id = ?', args: [String(user.id)] });

    const userPlan = String(user.plan || 'free');
    const accessToken = await new SignJWT({
      sub: String(user.id), role: String(user.role), plan: userPlan, organizationId: String(user.organizationId),
    }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(ACCESS_SECRET);

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    const loginNow = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)',
      args: [uuidv4(), String(user.id), tokenHash, expiresAt, loginNow],
    });
    await db.execute({ sql: 'UPDATE "User" SET lastLoginAt = ? WHERE id = ?', args: [loginNow, String(user.id)] });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: userPlan, organizationId: user.organizationId },
    });
  } catch (err: any) {
    console.error('restore-account error:', err);
    return NextResponse.json({ message: 'Failed to restore account' }, { status: 500 });
  }
}
