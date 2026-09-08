import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const RL_WINDOW_MS = 15 * 60 * 1000;
const RL_MAX       = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { token, password } = body ?? {};

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and new password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();

    // IP-based rate limit: 5 attempts per 15 minutes
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlKey = `reset-pw:${ip}`;
    const now = Date.now();
    const resetAt = now + RL_WINDOW_MS;
    await db.execute({
      sql: `INSERT INTO "RateLimit" (key, count, resetAt) VALUES (?, 1, ?)
            ON CONFLICT (key) DO UPDATE SET
              count   = CASE WHEN "RateLimit".resetAt < ? THEN 1 ELSE "RateLimit".count + 1 END,
              resetAt = CASE WHEN "RateLimit".resetAt < ? THEN ? ELSE "RateLimit".resetAt END`,
      args: [rlKey, resetAt, now, now, resetAt],
    });
    const rl = await db.execute({ sql: 'SELECT count FROM "RateLimit" WHERE key = ?', args: [rlKey] });
    if (Number(rl.rows[0]?.count ?? 0) > RL_MAX) {
      return NextResponse.json({ message: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 });
    }
    const tokenHash = createHash('sha256').update(String(token)).digest('hex');
    const now = Date.now();

    const result = await db.execute({
      sql: 'SELECT id, userId, expiresAt, usedAt FROM "PasswordResetToken" WHERE tokenHash = ?',
      args: [tokenHash],
    });

    if (!result.rows.length) {
      return NextResponse.json({ message: 'Invalid or expired reset link' }, { status: 400 });
    }

    const row = result.rows[0] as any;

    if (row.usedAt) {
      return NextResponse.json({ message: 'This reset link has already been used' }, { status: 400 });
    }
    if (Number(row.expiresAt) < now) {
      return NextResponse.json({ message: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(password, 12);
    await db.execute({
      sql: 'UPDATE "User" SET passwordHash = ?, updatedAt = ? WHERE id = ?',
      args: [newHash, now, row.userId],
    });

    // Mark token used
    await db.execute({
      sql: 'UPDATE "PasswordResetToken" SET usedAt = ? WHERE id = ?',
      args: [now, row.id],
    });

    // Revoke all refresh tokens so old sessions are kicked
    await db.execute({
      sql: 'UPDATE "RefreshToken" SET revoked = 1 WHERE userId = ?',
      args: [row.userId],
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
