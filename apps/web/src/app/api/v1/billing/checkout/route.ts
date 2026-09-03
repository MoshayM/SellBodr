import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
);

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let userId: string;
  let userEmail: string | undefined;
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    userId    = String(payload.sub ?? '');
    userEmail = payload.email as string | undefined;
    if (!userId) throw new Error('no sub');
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId   = process.env.STRIPE_CREDIT_PRICE_ID;
  if (!stripeKey) return NextResponse.json({ error: 'Stripe not configured — add STRIPE_SECRET_KEY to env' }, { status: 503 });
  if (!priceId)   return NextResponse.json({ error: 'Stripe price not configured — add STRIPE_CREDIT_PRICE_ID to env' }, { status: 503 });

  const stripe = new Stripe(stripeKey);
  const origin = req.headers.get('origin') || 'https://sellbodr.vercel.app';

  const session = await stripe.checkout.sessions.create({
    mode:                 'payment',
    payment_method_types: ['card'],
    customer_email:       userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/settings?tab=billing&cancelled=1`,
    metadata:    { userId },
  });

  return NextResponse.json({ url: session.url });
}
