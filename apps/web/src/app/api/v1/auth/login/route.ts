import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getDb } from '@/lib/db';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me');
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });

    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM "User" WHERE email = ? AND deletedAt IS NULL', args: [email] });
    const user = result.rows[0];

    if (!user || !user.passwordHash) return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });

    const valid = await bcrypt.compare(password, String(user.passwordHash));
    if (!valid) return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });

    // Issue tokens
    const accessToken = await new SignJWT({ sub: String(user.id), role: String(user.role), organizationId: String(user.organizationId) })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(ACCESS_SECRET);

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash  = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now        = new Date().toISOString();

    await db.execute({ sql: 'INSERT INTO "RefreshToken" (id, userId, tokenHash, expiresAt, revoked, createdAt) VALUES (?,?,?,?,0,?)', args: [uuidv4(), String(user.id), tokenHash, expiresAt, now] });
    await db.execute({ sql: 'UPDATE "User" SET lastLoginAt = ? WHERE id = ?', args: [now, String(user.id)] });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Login failed. Please try again.' }, { status: 500 });
  }
}
