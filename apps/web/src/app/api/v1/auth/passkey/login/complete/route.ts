import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { SignJWT } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

function getRpId(req: NextRequest): string {
  return process.env.WEBAUTHN_RP_ID ?? req.headers.get('host')?.split(':')[0] ?? 'localhost';
}

function getOrigin(req: NextRequest): string {
  return req.headers.get('origin') ?? `https://${req.headers.get('host') ?? 'localhost'}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.challengeId || !body?.response) {
      return NextResponse.json({ message: 'challengeId and response are required' }, { status: 400 });
    }
    const { challengeId, response } = body;

    const db = getDb();
    await ensureSchema(db);

    // Load challenge
    const cr = await db.execute({
      sql: 'SELECT * FROM "WebAuthnChallenge" WHERE id = ? AND type = ?',
      args: [challengeId, 'login'],
    });
    const challenge = cr.rows[0];
    if (!challenge) return NextResponse.json({ message: 'Invalid or expired challenge' }, { status: 400 });
    if (Number(challenge.expiresAt) < Date.now()) {
      await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
      return NextResponse.json({ message: 'Challenge expired. Please try again.' }, { status: 400 });
    }

    // Look up passkey by credential ID from the response
    const credentialId = response.id as string; // base64url
    const pkRes = await db.execute({ sql: 'SELECT * FROM "Passkey" WHERE credentialId = ?', args: [credentialId] });
    const passkey = pkRes.rows[0];
    if (!passkey) {
      await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
      return NextResponse.json({ message: 'Passkey not found. Please register first.' }, { status: 404 });
    }

    const rpId   = getRpId(req);
    const origin = getOrigin(req);

    // Verify authentication
    let verification: any;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: String(challenge.challenge),
        expectedOrigin: origin,
        expectedRPID: rpId,
        authenticator: {
          credentialID: Buffer.from(String(passkey.credentialId), 'base64url'),
          credentialPublicKey: Buffer.from(String(passkey.publicKey), 'base64url'),
          counter: Number(passkey.counter),
          transports: JSON.parse(String(passkey.transports || '[]')),
        },
        requireUserVerification: false,
      });
    } catch (err: any) {
      await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
      return NextResponse.json({ message: err.message || 'Passkey authentication failed' }, { status: 400 });
    }

    if (!verification.verified) {
      await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
      return NextResponse.json({ message: 'Passkey authentication failed' }, { status: 401 });
    }

    // Consume challenge and update counter
    const newCounter = verification.authenticationInfo?.newCounter ?? Number(passkey.counter);
    const now        = Date.now();
    await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
    await db.execute({
      sql: 'UPDATE "Passkey" SET counter = ?, lastUsedAt = ? WHERE id = ?',
      args: [newCounter, now, String(passkey.id)],
    });

    // Load user
    const userId = String(passkey.userId);
    const userRes = await db.execute({
      sql: 'SELECT * FROM "User" WHERE id = ? AND deletedAt IS NULL',
      args: [userId],
    });
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ message: 'User account not found' }, { status: 404 });

    // Issue tokens
    const accessToken = await new SignJWT({
      sub: userId,
      role: String(user.role),
      organizationId: String(user.organizationId),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(ACCESS_SECRET);

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash  = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt  = now + 7 * 24 * 60 * 60 * 1000;
    await db.execute({
      sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)',
      args: [uuidv4(), userId, tokenHash, expiresAt, now],
    });
    await db.execute({ sql: 'UPDATE "User" SET lastLoginAt = ? WHERE id = ?', args: [now, userId] });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (err: any) {
    console.error('passkey login complete error:', err);
    return NextResponse.json({ message: 'Login failed. Please try again.' }, { status: 500 });
  }
}
