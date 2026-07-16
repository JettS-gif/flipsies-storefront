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

interface CartItem {
  /** Present on ordinary product lines; absent on a package (bundle) line. */
  product_id?: string;
  /** Present on a package line — the backend expands it into components. */
  package_id?: string;
  sku?: string;
  name?: string;
  price?: number;
  qty: number;
}

interface RequestBody {
  items: CartItem[];
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  fulfillment: {
    type: 'delivery' | 'pickup';
    address?: string;
    date?: string;
    time_window?: string;
  };
  delivery_fee?: number;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { items, customer, fulfillment, delivery_fee = 0 } = body;

    if (!items?.length || !customer?.name || !customer?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the order in DeliverDesk backend FIRST. The backend is the
    // single source of truth for money: it re-fetches each product's
    // authoritative retail_price, re-derives the tax rate from the
    // jurisdiction, and bounds the delivery fee — ignoring any client
    // `price`/`tax_rate` we send. We then charge EXACTLY the total it
    // returns, so a tampered client can no longer self-discount the cart
    // or under-charge the card. (Client `price` is sent only as a hint
    // for logging; the backend overwrites it.)
    const orderRes = await fetch(`${API_BASE}/store/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        // A package line forwards only { package_id, qty }: the backend
        // expands it from the packages row and allocates the bundle price
        // across the components itself (utils/expandPackage.js). Passing a
        // client-built component list or price would be ignored anyway — and
        // must be, for the same reason the product price is re-derived.
        items: items.map(i => (
          i.package_id
            ? { package_id: i.package_id, qty: i.qty }
            : {
                product_id: i.product_id,
                sku: i.sku,
                name: i.name,
                qty: i.qty,
                price: i.price,
              }
        )),
        fulfillment,
        delivery_fee,
        notes: 'Online order — payment pending via Stripe.',
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json().catch(() => ({ error: 'Order creation failed' }));
      // Forward the backend status + full body so the checkout UI can
      // act on structured errors (e.g. 409 item_oversold needs the
      // items[] list to tell the customer which cart lines to remove).
      // Without this, 4xx race / validation errors looked identical to
      // 5xx server failures.
      return NextResponse.json(err, { status: orderRes.status });
    }

    const order = await orderRes.json();
    const total = Number(order.total);
    if (!(total > 0)) {
      console.error('Backend returned non-positive total:', order);
      return NextResponse.json({ error: 'Order total invalid' }, { status: 500 });
    }
    const amountCents = Math.round(total * 100);

    // Create Stripe PaymentIntent for the backend-authoritative amount.
    const paymentIntent = await getStripeServer().paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        invoice_id: order.invoice_id,
        invoice_number: order.invoice_number,
        customer_email: customer.email,
        customer_name: customer.name,
      },
      receipt_email: customer.email,
      description: `Flipsies Furniture — ${order.invoice_number}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      invoice_number: order.invoice_number,
      invoice_id: order.invoice_id,
      total,
      taxRate: order.tax_rate,
      jurisdiction: order.tax_jurisdiction,
    });
  } catch (err) {
    console.error('Payment intent error:', err);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
