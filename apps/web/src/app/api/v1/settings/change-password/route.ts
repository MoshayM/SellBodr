import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
);

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { payload } = await jwtVerify(auth, ACCESS_SECRET);
    const userId = payload.sub as string;

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'currentPassword and newPassword are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();
    const result = await db.execute({ sql: 'SELECT id, passwordHash FROM "User" WHERE id = ?', args: [userId] });
    if (!result.rows.length) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, String(user.passwordHash));
    if (!valid) return NextResponse.json({ message: 'Current password is incorrect' }, { status: 401 });

    const newHash = await bcrypt.hash(newPassword, 12);
    const now = new Date().toISOString();
    await db.execute({ sql: 'UPDATE "User" SET passwordHash=?, updatedAt=? WHERE id=?', args: [newHash, now, userId] });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json({ message: 'Failed to change password' }, { status: 500 });
  }
}
