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
  product_id: string;
  sku: string;
  name: string;
  price: number;
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

    // Determine tax rate based on delivery destination or pickup location
    let taxRate = 0.10; // default fallback
    let jurisdiction = 'Default';
    try {
      // For delivery: use customer's city from address; for pickup: use Irondale
      const taxCity = fulfillment.type === 'pickup' ? 'Irondale' : extractCity(fulfillment.address);
      if (taxCity) {
        const taxRes = await fetch(`${API_BASE}/storefront/tax-rate?city=${encodeURIComponent(taxCity)}`);
        if (taxRes.ok) {
          const taxData = await taxRes.json();
          taxRate = Number(taxData.rate) || 0.10;
          jurisdiction = taxData.jurisdiction || 'Default';
        }
      }
    } catch { /* use default rate */ }

    // Calculate total server-side to prevent client-side tampering
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax + delivery_fee;
    const amountCents = Math.round(total * 100);

    // Create the order in DeliverDesk backend
    const orderRes = await fetch(`${API_BASE}/store/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        items: items.map(i => ({
          product_id: i.product_id,
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
        fulfillment,
        tax_rate: taxRate,
        tax_jurisdiction: jurisdiction,
        notes: `Online order — payment pending via Stripe`,
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json().catch(() => ({ error: 'Order creation failed' }));
      return NextResponse.json({ error: err.error || 'Order creation failed' }, { status: 500 });
    }

    const order = await orderRes.json();

    // Create Stripe PaymentIntent
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
      taxRate,
      jurisdiction,
    });
  } catch (err) {
    console.error('Payment intent error:', err);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// Extract city from a free-text address string (best effort)
function extractCity(address?: string): string | null {
  if (!address) return null;
  // Try to match "City, ST ZIP" or "City, State" pattern
  const parts = address.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    // Second-to-last part before state/zip is usually the city
    return parts[parts.length - 2] || parts[0];
  }
  return parts[0] || null;
}
