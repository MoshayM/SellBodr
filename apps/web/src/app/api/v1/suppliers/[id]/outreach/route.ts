import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

async function requireAuth(req: NextRequest): Promise<string> {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) throw new Error('Unauthorized');
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return String(payload.sub);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireAuth(req);
    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT id, channel, subject, messageBody, status, createdAt
            FROM "SupplierOutreach"
            WHERE supplierId = ? AND userId = ?
            ORDER BY createdAt DESC LIMIT 50`,
      args: [params.id, userId],
    });

    return NextResponse.json(r.rows.map(row => ({
      id: row.id, channel: row.channel, subject: row.subject,
      messageBody: row.messageBody, status: row.status, createdAt: row.createdAt,
    })));
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const { channel, subject, messageBody, opportunityId } = body;

    if (!channel) return NextResponse.json({ message: 'channel is required' }, { status: 400 });

    const db = getDb();
    await ensureSchema(db);

    const id = uuidv4();
    const now = Date.now();
    await db.execute({
      sql: `INSERT INTO "SupplierOutreach" (id, supplierId, userId, opportunityId, channel, subject, messageBody, status, createdAt)
            VALUES (?,?,?,?,?,?,?,?,?)`,
      args: [id, params.id, userId, opportunityId || null, channel, subject || null, messageBody || null, 'sent', now],
    });

    return NextResponse.json({ id, channel, status: 'sent', createdAt: now }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('Outreach POST error:', err);
    return NextResponse.json({ message: 'Failed to log outreach' }, { status: 500 });
  }
}
