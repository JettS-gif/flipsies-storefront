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

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { invoice_id, customer_email, customer_name } = pi.metadata;

    if (invoice_id) {
      try {
        // Idempotency: pass Stripe's unique event.id alongside the
        // payment_intent.id. The backend already dedupes on
        // reference_number (= pi.id), but two distinct events for
        // the same PI (e.g. succeeded then succeeded-after-capture)
        // have the same pi.id and would otherwise get collapsed. The
        // event_id is unique per Stripe delivery attempt; the backend
        // can use it to distinguish "same payment, retried webhook"
        // (safe to no-op) from "same payment, second event" (logic
        // may differ).
        const res = await fetch(`${API_BASE}/store/record-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Forward as an idempotency hint; backend can read either
            // the header or the body field.
            'X-Stripe-Event-Id': event.id,
          },
          body: JSON.stringify({
            invoice_id,
            amount: pi.amount / 100,
            method: 'stripe',
            reference_number: pi.id,
            stripe_event_id: event.id,
            customer_email,
            customer_name,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.error('Payment recording failed:', res.status, errBody);
          // Return 500 so Stripe retries the webhook
          return NextResponse.json({ error: 'Payment recording failed' }, { status: 500 });
        }
      } catch (err) {
        console.error('Failed to record payment:', err);
        // Return 500 so Stripe retries the webhook
        return NextResponse.json({ error: 'Payment recording error' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
