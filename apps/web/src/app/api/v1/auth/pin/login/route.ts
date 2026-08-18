import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me');
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30 * 60 * 1000; // 30 min

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    await ensureSchema(db);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').toLowerCase().trim();
    const pin   = String(body.pin   ?? '');

    if (!email || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ message: 'Email and 4-digit PIN required' }, { status: 400 });
    }

    const res = await db.execute({
      sql: `SELECT id, name, email, plan, role, organizationId,
                   pinHash, pinAttempts, pinLockedUntil
              FROM "User" WHERE email = ? AND deletedAt IS NULL`,
      args: [email],
    });

    const user = res.rows[0] as any;
    if (!user || !user.pinHash) {
      return NextResponse.json(
        { message: 'No PIN set for this account — sign in with your password first.' },
        { status: 401 },
      );
    }

    const now = Date.now();

    if (user.pinLockedUntil && Number(user.pinLockedUntil) > now) {
      const mins = Math.ceil((Number(user.pinLockedUntil) - now) / 60_000);
      return NextResponse.json(
        { message: `Too many wrong attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.` },
        { status: 429 },
      );
    }

    const valid = await compare(pin, String(user.pinHash));
    if (!valid) {
      const attempts = (Number(user.pinAttempts) || 0) + 1;
      const lock     = attempts >= MAX_ATTEMPTS;
      await db.execute({
        sql: 'UPDATE "User" SET pinAttempts = ?, pinLockedUntil = ?, updatedAt = ? WHERE id = ?',
        args: [attempts, lock ? now + LOCKOUT_MS : null, now, String(user.id)],
      });
      if (lock) {
        return NextResponse.json(
          { message: 'Too many wrong attempts — account locked for 30 minutes.' },
          { status: 429 },
        );
      }
      const left = MAX_ATTEMPTS - attempts;
      return NextResponse.json(
        { message: `Wrong PIN. ${left} attempt${left !== 1 ? 's' : ''} left.` },
        { status: 401 },
      );
    }

    await db.execute({
      sql: 'UPDATE "User" SET pinAttempts = 0, pinLockedUntil = NULL, lastLoginAt = ?, updatedAt = ? WHERE id = ?',
      args: [now, now, String(user.id)],
    });

    const userId      = String(user.id);
    const accessToken = await new SignJWT({ sub: userId, email: user.email, role: user.role, plan: user.plan })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(ACCESS_SECRET);

    const refreshRaw = uuidv4();
    const tokenHash  = createHash('sha256').update(refreshRaw).digest('hex');
    const expiresAt  = now + 30 * 24 * 60 * 60 * 1000;
    await db.execute({
      sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)',
      args: [uuidv4(), userId, tokenHash, expiresAt, now],
    });

    return NextResponse.json({
      accessToken,
      refreshToken: refreshRaw,
      user: {
        id:             userId,
        email:          user.email,
        name:           user.name,
        plan:           user.plan,
        role:           user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (err: any) {
    console.error('pin/login error:', err);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
