import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { ACCESS_SECRET, REFRESH_SECRET } from '@/lib/auth-secrets';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const RL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RL_MAX       = 10;              // max attempts per window

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }
    const { email, password } = body;

    const db = getDb();
    await ensureSchema(db);

    // Brute-force protection: DB-backed rate limit by IP
    const ip    = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlKey = `login:${ip}`;
    const now   = Date.now();
    const resetAt = now + RL_WINDOW_MS;

    // Atomic upsert: reset window if expired, otherwise increment
    await db.execute({
      sql: `INSERT INTO "RateLimit" (key, count, resetAt) VALUES (?, 1, ?)
            ON CONFLICT (key) DO UPDATE SET
              count   = CASE WHEN "RateLimit".resetAt < ? THEN 1 ELSE "RateLimit".count + 1 END,
              resetAt = CASE WHEN "RateLimit".resetAt < ? THEN ? ELSE "RateLimit".resetAt END`,
      args: [rlKey, resetAt, now, now, resetAt],
    });

    const rl = await db.execute({ sql: 'SELECT count, resetAt FROM "RateLimit" WHERE key = ?', args: [rlKey] });
    if (Number(rl.rows[0]?.count ?? 0) > RL_MAX) {
      return NextResponse.json({ message: 'Too many login attempts. Please try again in 15 minutes.' }, { status: 429 });
    }

    const GRACE_MS = 24 * 60 * 60 * 1000;
    const result = await db.execute({ sql: 'SELECT * FROM "User" WHERE email = ?', args: [email] });
    const user = result.rows[0];

    if (!user || !user.passwordHash) return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });

    // Account is soft-deleted
    if (user.deletedAt) {
      const deletedAt = Number(user.deletedAt);
      const valid = await bcrypt.compare(password, String(user.passwordHash));
      if (!valid) return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
      // Within 24h grace period — let user choose to restore or purge
      if (now - deletedAt < GRACE_MS) {
        await db.execute({ sql: 'DELETE FROM "RateLimit" WHERE key = ?', args: [rlKey] });
        return NextResponse.json({
          pendingDeletion: true,
          deletionExpiresAt: deletedAt + GRACE_MS,
          email,
        });
      }
      // Past grace period — account is gone
      return NextResponse.json({ message: 'This account has been permanently deleted.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, String(user.passwordHash));
    if (!valid) return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });

    // Reset rate limit on success
    await db.execute({ sql: 'DELETE FROM "RateLimit" WHERE key = ?', args: [rlKey] });

    // Issue tokens
    const userPlan = String(user.plan || 'free');
    const accessToken = await new SignJWT({ sub: String(user.id), role: String(user.role), plan: userPlan, organizationId: String(user.organizationId) })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(ACCESS_SECRET);

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash  = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const loginNow   = new Date().toISOString();

    await db.execute({ sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)', args: [uuidv4(), String(user.id), tokenHash, expiresAt, loginNow] });
    await db.execute({ sql: 'UPDATE "User" SET lastLoginAt = ? WHERE id = ?', args: [loginNow, String(user.id)] });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: userPlan, organizationId: user.organizationId },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Login failed. Please try again.' }, { status: 500 });
  }
}
