import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import Razorpay from 'razorpay';
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

  const db = getDb();
  await ensureSchema(db);

  const userRes = await db.execute({ sql: `SELECT plan FROM "User" WHERE id = ?`, args: [userId] });
  if ((userRes.rows[0] as any)?.plan === 'pro') {
    return NextResponse.json({ error: 'Already on Pro plan' }, { status: 400 });
  }

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  const amountPaise = country === 'IN'
    ? 9900  // ₹99/mo for India
    : Number(process.env.RAZORPAY_PRO_AMOUNT_PAISE ?? 149900);

  const order = await razorpay.orders.create({
    amount:   amountPaise,
    currency: 'INR',
    receipt:  `pro_${userId}_${Date.now()}`,
    notes:    { userId, type: 'pro_subscription' },
  });

  return NextResponse.json({
    orderId:  order.id,
    amount:   order.amount,
    currency: order.currency,
    keyId,
  });
}
