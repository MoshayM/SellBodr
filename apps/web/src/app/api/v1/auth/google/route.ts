import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me');
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.credential) {
      return NextResponse.json({ message: 'Google credential required' }, { status: 400 });
    }

    // Verify the Google ID token via Google's tokeninfo endpoint
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${body.credential}`
    );
    if (!tokenRes.ok) {
      return NextResponse.json({ message: 'Invalid Google token' }, { status: 401 });
    }
    const payload = await tokenRes.json() as {
      sub: string; email: string; name?: string;
      email_verified?: string; aud?: string;
    };

    if (!payload.email || payload.email_verified !== 'true') {
      return NextResponse.json({ message: 'Google email not verified' }, { status: 401 });
    }

    // Optionally verify audience matches our client ID
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      return NextResponse.json({ message: 'Token audience mismatch' }, { status: 401 });
    }

    const db = getDb();
    await ensureSchema(db);

    const email = payload.email.toLowerCase();
    const now = new Date().toISOString();

    // Find existing user by email
    const result = await db.execute({
      sql: 'SELECT * FROM "User" WHERE email = ? AND deletedAt IS NULL',
      args: [email],
    });
    let user = result.rows[0] as any;

    if (!user) {
      // First-time Google sign-in → create account automatically
      const userId = uuidv4();
      const sentinelHash = `GOOGLE:${payload.sub}`;
      const displayName = payload.name || email.split('@')[0];
      await db.execute({
        sql: `INSERT INTO "User" (id, email, passwordHash, name, role, plan, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, 'member', 'free', ?, ?)`,
        args: [userId, email, sentinelHash, displayName, now, now],
      });
      user = { id: userId, email, name: displayName, role: 'member', plan: 'free', organizationId: null };
    } else if (!String(user.passwordHash).startsWith('GOOGLE:') && String(user.passwordHash).startsWith('$2')) {
      // Existing password account — allow Google sign-in for same email (link accounts)
      // No action needed; just log them in
    }

    // Update lastLoginAt
    await db.execute({
      sql: 'UPDATE "User" SET lastLoginAt = ? WHERE id = ?',
      args: [now, String(user.id)],
    });

    // Issue JWT tokens
    const userPlan = String(user.plan || 'free');
    const accessToken = await new SignJWT({
      sub: String(user.id),
      role: String(user.role),
      plan: userPlan,
      organizationId: String(user.organizationId || ''),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(ACCESS_SECRET);

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash  = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.execute({
      sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)',
      args: [uuidv4(), String(user.id), tokenHash, expiresAt, now],
    });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 900,
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, plan: userPlan, organizationId: user.organizationId,
      },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    return NextResponse.json({ message: 'Google sign-in failed. Please try again.' }, { status: 500 });
  }
}
