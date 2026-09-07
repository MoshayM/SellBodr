import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

import { ACCESS_SECRET } from '@/lib/auth-secrets';

const RL_WINDOW_MS = 15 * 60 * 1000;
const RL_MAX       = 10;

function getRpId(req: NextRequest): string {
  return process.env.WEBAUTHN_RP_ID ?? req.headers.get('host')?.split(':')[0] ?? 'localhost';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    await ensureSchema(db);

    const ip      = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlKey   = `pkregister:${ip}`;
    const rlNow   = Date.now();
    const resetAt = rlNow + RL_WINDOW_MS;
    await db.execute({
      sql: `INSERT INTO "RateLimit" (key, count, resetAt) VALUES (?, 1, ?)
            ON CONFLICT (key) DO UPDATE SET
              count   = CASE WHEN "RateLimit".resetAt < ? THEN 1 ELSE "RateLimit".count + 1 END,
              resetAt = CASE WHEN "RateLimit".resetAt < ? THEN ? ELSE "RateLimit".resetAt END`,
      args: [rlKey, resetAt, rlNow, rlNow, resetAt],
    });
    const rl = await db.execute({ sql: 'SELECT count FROM "RateLimit" WHERE key = ?', args: [rlKey] });
    if (Number(rl.rows[0]?.count ?? 0) > RL_MAX) {
      return NextResponse.json({ message: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    // If auth token present → adding passkey to existing user
    const auth = req.headers.get('authorization')?.split(' ')[1];
    if (auth) {
      try {
        const { payload } = await jwtVerify(auth, ACCESS_SECRET);
        userId = String(payload.sub);
        const res = await db.execute({ sql: 'SELECT email, name FROM "User" WHERE id = ?', args: [userId] });
        if (res.rows[0]) {
          userEmail = String(res.rows[0].email);
          userName  = String(res.rows[0].name ?? res.rows[0].email);
        }
      } catch { /* invalid token — treat as new user */ }
    }

    // If no auth, require email + name in body
    if (!userId) {
      if (!body.email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });
      userEmail = String(body.email).toLowerCase().trim();
      userName  = body.name ? String(body.name).trim() : userEmail;
      // Check if email already exists
      const existing = await db.execute({ sql: 'SELECT id FROM "User" WHERE email = ?', args: [userEmail] });
      if (existing.rows.length > 0) {
        userId = String(existing.rows[0].id);
        const ur = await db.execute({ sql: 'SELECT name FROM "User" WHERE id = ?', args: [userId] });
        userName = String(ur.rows[0]?.name ?? userEmail);
      }
    }

    const rpId = getRpId(req);
    const tempUserId = userId ?? `pending-${uuidv4()}`;

    // Load existing passkeys for this user (to exclude from registration)
    const existingPasskeys = userId
      ? (await db.execute({ sql: 'SELECT credentialId, transports FROM "Passkey" WHERE userId = ?', args: [userId] })).rows
      : [];

    const options = await generateRegistrationOptions({
      rpName: 'SellBodr',
      rpID: rpId,
      userID: tempUserId,
      userName: userEmail ?? tempUserId,
      userDisplayName: userName ?? userEmail ?? tempUserId,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map(pk => ({
        id: Buffer.from(String(pk.credentialId), 'base64url'),
        type: 'public-key' as const,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        // no authenticatorAttachment — allows platform (Windows Hello PIN, Touch ID) AND
        // cross-platform (USB security keys) so desktop users without biometrics can still proceed
      },
    });

    // Store challenge
    const challengeId = uuidv4();
    const expiresAt   = Date.now() + 5 * 60 * 1000;
    const now         = Date.now();
    await db.execute({
      sql: 'INSERT INTO "WebAuthnChallenge" (id, challenge, userId, email, name, type, expiresAt, createdAt) VALUES (?,?,?,?,?,?,?,?)',
      args: [challengeId, options.challenge, userId, userEmail, userName, 'register', expiresAt, now],
    });

    return NextResponse.json({ challengeId, ...options });
  } catch (err: any) {
    console.error('passkey register begin error:', err);
    return NextResponse.json({ message: 'Failed to begin passkey registration' }, { status: 500 });
  }
}
