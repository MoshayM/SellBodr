import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const RL_WINDOW_MS = 15 * 60 * 1000;
const RL_MAX       = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password)
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 });

    const db = getDb();
    await ensureSchema(db);

    // IP-based rate limit: 5 attempts per 15 minutes (permanent delete — strict)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlKey = `purge:${ip}`;
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

    const result = await db.execute({
      sql: 'SELECT * FROM "User" WHERE email = ? AND deletedAt IS NOT NULL',
      args: [body.email],
    });
    const user = result.rows[0];
    if (!user) return NextResponse.json({ message: 'Account not found or not pending deletion' }, { status: 404 });

    const valid = await bcrypt.compare(body.password, String(user.passwordHash));
    if (!valid) return NextResponse.json({ message: 'Invalid password' }, { status: 401 });

    const userId = String(user.id);

    // Hard delete: remove PII. Keep CreditTransaction, Search, AuditLog for compliance.
    await db.execute({ sql: 'DELETE FROM "RefreshToken" WHERE userId = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM "Passkey" WHERE userId = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE userId = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM "SupplierOutreach" WHERE userId = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM "User" WHERE id = ?', args: [userId] });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('purge-account error:', err);
    return NextResponse.json({ message: 'Failed to delete account' }, { status: 500 });
  }
}
