import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

// Stripe sends raw body — must not parse as JSON
export async function POST(req: NextRequest) {
  const stripeKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = new Stripe(stripeKey).webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.userId;
    if (!userId) return NextResponse.json({ ok: true });

    const db = getDb();
    await ensureSchema(db);
    const ts = Date.now();

    await db.execute({
      sql:  `UPDATE "User" SET credits = credits + 10, updatedAt = ? WHERE id = ?`,
      args: [ts, userId],
    });
    await db.execute({
      sql:  `INSERT INTO "CreditTransaction" (id, userId, type, amount, reason, stripeSessionId, createdAt) VALUES (?, ?, 'purchase', 10, 'stripe_checkout', ?, ?)`,
      args: [crypto.randomUUID(), userId, session.id, ts],
    });
  }

  return NextResponse.json({ ok: true });
}
