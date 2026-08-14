import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.name || !body.email || !body.password) {
      return NextResponse.json({ message: 'Name, email and password are required' }, { status: 400 });
    }
    const { name, email, password, orgName } = body;
    if (password.length < 8) return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });

    const db  = getDb();
    await ensureSchema(db);
    const existing = await db.execute({ sql: 'SELECT id FROM "User" WHERE email = ?', args: [email] });
    if (existing.rows.length > 0) return NextResponse.json({ message: 'Email already registered' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const now    = new Date().toISOString();
    const orgId  = uuidv4();
    const userId = uuidv4();
    const subId  = uuidv4();

    await db.execute({ sql: 'INSERT INTO "Organization" (id, name, plan, createdAt, updatedAt) VALUES (?,?,?,?,?)', args: [orgId, orgName || `${name}'s Organisation`, 'starter', now, now] });
    await db.execute({ sql: 'INSERT INTO "Subscription" (id, organizationId, plan, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?)', args: [subId, orgId, 'starter', 'active', now, now] });
    await db.execute({ sql: 'INSERT INTO "User" (id, organizationId, email, passwordHash, name, role, mfaEnabled, createdAt, updatedAt) VALUES (?,?,?,?,?,?,0,?,?)', args: [userId, orgId, email, passwordHash, name, 'owner', now, now] });
    await db.execute({ sql: 'INSERT INTO "AuditLog" (id, organizationId, actorUserId, action, resourceType, resourceId, createdAt) VALUES (?,?,?,?,?,?,?)', args: [uuidv4(), orgId, userId, 'auth.register', 'user', userId, now] });

    const accessToken = await new SignJWT({ sub: userId, role: 'owner', organizationId: orgId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(ACCESS_SECRET);

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash  = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute({ sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)', args: [uuidv4(), userId, tokenHash, expiresAt, now] });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 900,
      user: { id: userId, email, name, role: 'owner', organizationId: orgId },
    }, { status: 201 });
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json({ message: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
