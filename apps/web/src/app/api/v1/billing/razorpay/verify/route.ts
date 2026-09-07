import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createHmac } from 'crypto';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { ACCESS_SECRET } from '@/lib/auth-secrets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    userId = String(payload.sub ?? '');
    if (!userId) throw new Error('no sub');
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 });

  // Verify Razorpay signature — prevents tampered payment data
  const expectedSig = createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  const db = getDb();
  await ensureSchema(db);

  // Idempotency — reuse stripeSessionId column to store Razorpay payment ID
  const existing = await db.execute({
    sql:  `SELECT id FROM "CreditTransaction" WHERE stripeSessionId = ? LIMIT 1`,
    args: [razorpay_payment_id],
  });
  if (existing.rows.length > 0) return NextResponse.json({ ok: true, credits: 10 });

  const ts = Date.now();
  await db.execute({
    sql:  `UPDATE "User" SET credits = credits + 10, updatedAt = ? WHERE id = ?`,
    args: [ts, userId],
  });
  await db.execute({
    sql:  `INSERT INTO "CreditTransaction" (id, userId, type, amount, reason, stripeSessionId, createdAt) VALUES (?, ?, 'purchase', 10, 'razorpay', ?, ?)`,
    args: [crypto.randomUUID(), userId, razorpay_payment_id, ts],
  });

  return NextResponse.json({ ok: true, credits: 10 });
}
