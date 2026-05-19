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
    try {
      // Forward the RAW event body + the stripe-signature header so the
      // backend independently re-verifies the signature and derives
      // invoice_id/amount from the VERIFIED event — it does not trust
      // any digested JSON we send. This closes the hole where a forged
      // direct POST to /store/record-payment could flip an invoice to
      // paid; the Next-side constructEvent above is now just an
      // early-reject fast path. `body` must be the exact bytes Stripe
      // signed — never re-serialize it.
      const res = await fetch(`${API_BASE}/store/record-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': sig,
        },
        body,
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

  return NextResponse.json({ received: true });
}
