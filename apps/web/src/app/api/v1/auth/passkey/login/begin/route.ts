import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

function getRpId(req: NextRequest): string {
  return process.env.WEBAUTHN_RP_ID ?? req.headers.get('host')?.split(':')[0] ?? 'localhost';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    await ensureSchema(db);

    const rpId = getRpId(req);
    let allowCredentials: { id: Buffer; type: 'public-key' }[] = [];
    let userId: string | null = null;

    if (body.email) {
      const email = String(body.email).toLowerCase().trim();
      const userRes = await db.execute({ sql: 'SELECT id FROM "User" WHERE email = ? AND deletedAt IS NULL', args: [email] });
      if (userRes.rows[0]) {
        userId = String(userRes.rows[0].id);
        const passkeys = await db.execute({ sql: 'SELECT credentialId FROM "Passkey" WHERE userId = ?', args: [userId] });
        allowCredentials = passkeys.rows.map(pk => ({
          id: Buffer.from(String(pk.credentialId), 'base64url'),
          type: 'public-key' as const,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    });

    const challengeId = uuidv4();
    const expiresAt   = Date.now() + 5 * 60 * 1000;
    const now         = Date.now();
    await db.execute({
      sql: 'INSERT INTO "WebAuthnChallenge" (id, challenge, userId, email, type, expiresAt, createdAt) VALUES (?,?,?,?,?,?,?)',
      args: [challengeId, options.challenge, userId, body.email ?? null, 'login', expiresAt, now],
    });

    return NextResponse.json({ challengeId, ...options });
  } catch (err: any) {
    console.error('passkey login begin error:', err);
    return NextResponse.json({ message: 'Failed to begin passkey login' }, { status: 500 });
  }
}
