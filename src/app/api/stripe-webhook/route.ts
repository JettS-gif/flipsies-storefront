import { NextResponse } from 'next/server';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
function getStripeServer() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }
  return _stripe;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeServer().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Forward the RAW event body + the stripe-signature header so the
  // backend independently re-verifies the signature and derives
  // invoice_id/amount/charge data from the VERIFIED event — it does not
  // trust any digested JSON we send. `body` must be the exact bytes
  // Stripe signed; never re-serialize it. The Next-side constructEvent
  // above is just an early-reject fast path.
  //
  //   payment_intent.succeeded       → /store/record-payment (records payment, creates order)
  //   payment_intent.payment_failed  → /store/stripe-event   (invoice note + office alert)
  //   charge.refunded                → /store/stripe-event   (manual-reconciliation alert)
  //   charge.dispute.created         → /store/stripe-event   (urgent office alert)
  //   anything else                  → ack, log
  //
  // 500 the response on a non-2xx backend reply so Stripe retries.
  const RECORD_PAYMENT_TYPES = new Set(['payment_intent.succeeded']);
  const STRIPE_EVENT_TYPES   = new Set([
    'payment_intent.payment_failed',
    'charge.refunded',
    'charge.dispute.created',
  ]);

  const targetPath = RECORD_PAYMENT_TYPES.has(event.type)
    ? '/store/record-payment'
    : STRIPE_EVENT_TYPES.has(event.type)
      ? '/store/stripe-event'
      : null;

  if (!targetPath) {
    console.log('Stripe webhook: unhandled event type', event.type);
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    const res = await fetch(`${API_BASE}${targetPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sig,
      },
      body,
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Backend ${targetPath} failed (${event.type}):`, res.status, errBody);
      // Return 500 so Stripe retries the webhook
      return NextResponse.json({ error: 'Backend processing failed' }, { status: 500 });
    }
  } catch (err) {
    console.error(`Failed to forward ${event.type} to ${targetPath}:`, err);
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: 'Webhook forwarding error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
