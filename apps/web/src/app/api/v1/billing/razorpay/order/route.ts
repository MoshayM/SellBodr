import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import Razorpay from 'razorpay';
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

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Razorpay not configured — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to env' }, { status: 503 });
  }

  const razorpay    = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const amountPaise = Number(process.env.RAZORPAY_CREDIT_AMOUNT_PAISE ?? 49900); // default ₹499

  const order = await razorpay.orders.create({
    amount:   amountPaise,
    currency: 'INR',
    receipt:  `credits_${userId}_${Date.now()}`,
    notes:    { userId, credits: '10' },
  });

  return NextResponse.json({
    orderId:  order.id,
    amount:   order.amount,
    currency: order.currency,
    keyId,
  });
}
