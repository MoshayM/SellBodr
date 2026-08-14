import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { SignJWT, jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me');
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

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
    const { challengeId, response, name: bodyName, orgName } = body;

    const db = getDb();
    await ensureSchema(db);

    // Determine if this is an add-to-existing-user call
    let existingUserId: string | null = null;
    const auth = req.headers.get('authorization')?.split(' ')[1];
    if (auth) {
      try {
        const { payload } = await jwtVerify(auth, ACCESS_SECRET);
        existingUserId = String(payload.sub);
      } catch { /* ignore */ }
    }

    // Load and validate challenge
    const cr = await db.execute({
      sql: 'SELECT * FROM "WebAuthnChallenge" WHERE id = ? AND type = ?',
      args: [challengeId, 'register'],
    });
    const challenge = cr.rows[0];
    if (!challenge) return NextResponse.json({ message: 'Invalid or expired challenge' }, { status: 400 });
    if (Number(challenge.expiresAt) < Date.now()) {
      await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
      return NextResponse.json({ message: 'Challenge expired. Please try again.' }, { status: 400 });
    }

    const rpId   = getRpId(req);
    const origin = getOrigin(req);

    // Verify the registration response
    let verification: any;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: String(challenge.challenge),
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: false,
      });
    } catch (err: any) {
      await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
      return NextResponse.json({ message: err.message || 'Passkey verification failed' }, { status: 400 });
    }

    if (!verification.verified || !verification.registrationInfo) {
      await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });
      return NextResponse.json({ message: 'Passkey verification failed' }, { status: 400 });
    }

    const info = verification.registrationInfo;
    const credentialId = response.id as string; // base64url, matches browser's credential.id
    const publicKey    = Buffer.from(info.credentialPublicKey).toString('base64url');
    const counter      = Number(info.counter ?? 0);
    const deviceType   = info.credentialDeviceType ?? 'singleDevice';
    const backedUp     = info.credentialBackedUp ? 1 : 0;
    const transports   = JSON.stringify(response.response?.transports ?? []);
    const now          = Date.now();

    // Consume challenge
    await db.execute({ sql: 'DELETE FROM "WebAuthnChallenge" WHERE id = ?', args: [challengeId] });

    // Check if this credential ID is already registered
    const dupCheck = await db.execute({
      sql: 'SELECT id FROM "Passkey" WHERE credentialId = ?',
      args: [credentialId],
    });
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ message: 'This passkey is already registered' }, { status: 409 });
    }

    if (existingUserId) {
      // Adding passkey to existing authenticated user
      const passkeyId = uuidv4();
      await db.execute({
        sql: 'INSERT INTO "Passkey" (id, userId, credentialId, publicKey, counter, deviceType, backedUp, transports, name, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
        args: [passkeyId, existingUserId, credentialId, publicKey, counter, deviceType, backedUp, transports, bodyName || 'Passkey', now],
      });
      return NextResponse.json({ success: true, passkey: { id: passkeyId, name: bodyName || 'Passkey', createdAt: now } });
    }

    // New user registration
    const challengeEmail = String(challenge.email ?? '');
    const challengeName  = String(challenge.name ?? challengeEmail);
    if (!challengeEmail) return NextResponse.json({ message: 'No email associated with this challenge' }, { status: 400 });

    // Check if user already exists by email
    const existing = await db.execute({ sql: 'SELECT id, organizationId, role FROM "User" WHERE email = ?', args: [challengeEmail] });
    let userId: string;
    let orgId: string;
    let role: string;

    if (existing.rows.length > 0) {
      // User exists → just add the passkey
      userId = String(existing.rows[0].id);
      orgId  = String(existing.rows[0].organizationId);
      role   = String(existing.rows[0].role);
    } else {
      // Create new user
      orgId  = uuidv4();
      userId = uuidv4();
      role   = 'owner';
      const subId = uuidv4();
      const orgName2 = orgName || `${challengeName}'s Organisation`;

      await db.execute({
        sql: 'INSERT INTO "Organization" (id, name, plan, createdAt, updatedAt) VALUES (?,?,?,?,?)',
        args: [orgId, orgName2, 'starter', now, now],
      });
      await db.execute({
        sql: 'INSERT INTO "Subscription" (id, organizationId, plan, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?)',
        args: [subId, orgId, 'starter', 'active', now, now],
      });
      await db.execute({
        sql: 'INSERT INTO "User" (id, organizationId, email, passwordHash, name, role, mfaEnabled, createdAt, updatedAt) VALUES (?,?,?,?,?,?,0,?,?)',
        args: [userId, orgId, challengeEmail, 'PASSKEY_ONLY', challengeName, role, now, now],
      });
      await db.execute({
        sql: 'INSERT INTO "AuditLog" (id, organizationId, actorUserId, action, resourceType, resourceId, createdAt) VALUES (?,?,?,?,?,?,?)',
        args: [uuidv4(), orgId, userId, 'auth.register.passkey', 'user', userId, now],
      });
    }

    // Store passkey
    await db.execute({
      sql: 'INSERT INTO "Passkey" (id, userId, credentialId, publicKey, counter, deviceType, backedUp, transports, name, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
      args: [uuidv4(), userId, credentialId, publicKey, counter, deviceType, backedUp, transports, 'Passkey', now],
    });

    // Issue tokens
    const accessToken = await new SignJWT({ sub: userId, role, organizationId: orgId })
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
      user: { id: userId, email: challengeEmail, name: challengeName, role, organizationId: orgId },
    }, { status: 201 });
  } catch (err: any) {
    console.error('passkey register complete error:', err);
    return NextResponse.json({ message: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
