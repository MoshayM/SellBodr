import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ message: 'ADMIN_EMAIL or ADMIN_PASSWORD env vars not set' }, { status: 500 });
  }

  const db = getDb();
  await ensureSchema(db);

  const existing = await db.execute({ sql: 'SELECT id, role FROM "User" WHERE email = ?', args: [adminEmail] });

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    if (user.role === 'admin') return NextResponse.json({ message: 'Admin already exists', email: adminEmail });
    // Upgrade existing user to admin
    await db.execute({ sql: 'UPDATE "User" SET role = ?, updatedAt = ? WHERE email = ?', args: ['admin', new Date().toISOString(), adminEmail] });
    return NextResponse.json({ message: 'Existing user upgraded to admin', email: adminEmail });
  }

  const now = new Date().toISOString();
  const orgId = uuidv4();
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await db.execute({ sql: 'INSERT INTO "Organization" (id, name, plan, createdAt, updatedAt) VALUES (?,?,?,?,?)', args: [orgId, 'SellBodr Admin', 'enterprise', now, now] });
  await db.execute({ sql: 'INSERT INTO "Subscription" (id, organizationId, plan, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?)', args: [uuidv4(), orgId, 'enterprise', 'active', now, now] });
  await db.execute({ sql: 'INSERT INTO "User" (id, organizationId, email, passwordHash, name, role, mfaEnabled, createdAt, updatedAt) VALUES (?,?,?,?,?,?,0,?,?)', args: [userId, orgId, adminEmail, passwordHash, 'SellBodr Admin', 'admin', now, now] });

  return NextResponse.json({ message: 'Admin user created', email: adminEmail });
}
