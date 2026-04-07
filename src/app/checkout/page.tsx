'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import Link from 'next/link';

// ── Step indicators ──────────────────────────────────────────────

const STEPS = ['Info', 'Fulfillment', 'Payment', 'Confirmation'] as const;

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i < current
                ? 'bg-brand-green text-white'
                : i === current
                ? 'bg-brand-yellow text-brand-charcoal'
                : 'bg-brand-warm-gray text-brand-charcoal-light'
            }`}
          >
            {i < current ? '✓' : i + 1}
          </div>
          <span
            className={`text-xs font-medium hidden sm:inline ${
              i === current ? 'text-brand-charcoal' : 'text-brand-charcoal-light'
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className="w-6 sm:w-10 h-px bg-brand-border" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Payment form (uses Stripe Elements context) ──────────────────

function PaymentForm({
  onSuccess,
  total,
  invoiceNumber,
}: {
  onSuccess: () => void;
  total: number;
  invoiceNumber: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout?status=success&invoice=${invoiceNumber}`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-brand-charcoal mb-4">Payment</h2>
      <div className="border border-brand-border rounded-lg p-4 mb-4">
        <PaymentElement />
      </div>
      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="btn-brand w-full text-base py-3 disabled:opacity-50"
      >
        {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
      </button>
    </form>
  );
}

// ── Main checkout page ───────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, itemCount } = useCart();

  const [step, setStep] = useState(0);

  // Customer info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Fulfillment
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');

  // Payment
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [total, setTotal] = useState(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);

  // Handle return from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      clearCart();
      setInvoiceNumber(params.get('invoice') || '');
      setStep(3);
      // Clean URL
      window.history.replaceState({}, '', '/checkout');
    }
  }, [clearCart]);

  // Redirect if cart is empty and not on confirmation
  if (itemCount === 0 && step < 3) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-brand-charcoal mb-3">Your cart is empty</h1>
        <Link href="/shop" className="btn-brand text-base px-8 py-3 mt-4 inline-block">
          Shop Now
        </Link>
      </div>
    );
  }

  // Step 1: Customer info
  function handleInfoSubmit(e: FormEvent) {
    e.preventDefault();
    setStep(1);
  }

  // Step 2: Fulfillment
  function handleFulfillmentSubmit(e: FormEvent) {
    e.preventDefault();
    createPaymentIntent();
  }

  // Create payment intent when moving to payment step
  async function createPaymentIntent() {
    setCreatingIntent(true);
    setPaymentError(null);

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            product_id: i.product_id,
            sku: i.sku,
            name: i.name,
            price: i.price,
            qty: i.qty,
          })),
          customer: { name, email, phone: phone || undefined },
          fulfillment: {
            type: fulfillmentType,
            address: fulfillmentType === 'delivery' ? address : undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create order');
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setInvoiceNumber(data.invoice_number);
      setTotal(data.total);
      setStep(2);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreatingIntent(false);
    }
  }

  function handlePaymentSuccess() {
    clearCart();
    setStep(3);
  }

  const taxRate = 0.10;
  const estimatedTax = subtotal * taxRate;
  const estimatedTotal = subtotal + estimatedTax;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-2">Checkout</h1>
      <StepBar current={step} />

      {/* ── Step 0: Customer Info ── */}
      {step === 0 && (
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-brand-charcoal mb-2">Your Information</h2>
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              placeholder="(205) 555-0123"
            />
          </div>

          {/* Order summary mini */}
          <div className="bg-brand-warm-gray rounded-lg p-4 mt-6">
            <p className="text-sm text-brand-charcoal-light">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} — Subtotal:{' '}
              <span className="font-semibold text-brand-charcoal">${subtotal.toFixed(2)}</span>
            </p>
          </div>

          <button type="submit" className="btn-brand w-full text-base py-3 mt-4">
            Continue to Fulfillment
          </button>
        </form>
      )}

      {/* ── Step 1: Fulfillment ── */}
      {step === 1 && (
        <form onSubmit={handleFulfillmentSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-brand-charcoal mb-2">How would you like to receive your order?</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFulfillmentType('delivery')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                fulfillmentType === 'delivery'
                  ? 'border-brand-yellow bg-brand-yellow-light'
                  : 'border-brand-border hover:border-brand-charcoal-light'
              }`}
            >
              <span className="text-lg">🚚</span>
              <p className="font-semibold text-brand-charcoal mt-1">Delivery</p>
              <p className="text-xs text-brand-charcoal-light">Starting at $99</p>
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentType('pickup')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                fulfillmentType === 'pickup'
                  ? 'border-brand-yellow bg-brand-yellow-light'
                  : 'border-brand-border hover:border-brand-charcoal-light'
              }`}
            >
              <span className="text-lg">🏬</span>
              <p className="font-semibold text-brand-charcoal mt-1">Warehouse Pickup</p>
              <p className="text-xs text-brand-charcoal-light">Free — schedule a time</p>
            </button>
          </div>

          {fulfillmentType === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Delivery Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                placeholder="123 Main St, Birmingham, AL 35201"
              />
              <p className="text-xs text-brand-charcoal-light mt-1">
                Delivery available within 50 miles of our Irondale location. Exact delivery fee calculated based on distance.
              </p>
            </div>
          )}

          {fulfillmentType === 'pickup' && (
            <div className="bg-brand-warm-gray rounded-lg p-4 text-sm text-brand-charcoal-light">
              <p className="font-semibold text-brand-charcoal mb-1">Pickup Location</p>
              <p>Flipsies Furniture — Irondale</p>
              <p>1811 Crestwood Blvd, Irondale, AL 35210</p>
              <p className="mt-2">We&apos;ll contact you to schedule a pickup time once your order is confirmed.</p>
            </div>
          )}

          {paymentError && (
            <p className="text-sm text-red-500">{paymentError}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setStep(0)} className="btn-outline flex-1 py-3">
              Back
            </button>
            <button type="submit" disabled={creatingIntent} className="btn-brand flex-1 py-3 disabled:opacity-50">
              {creatingIntent ? 'Creating Order...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: Payment ── */}
      {step === 2 && clientSecret && (
        <Elements
          stripe={getStripe()}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#C48E0A',
                borderRadius: '8px',
              },
            },
          }}
        >
          <div className="mb-4 bg-brand-warm-gray rounded-lg p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-brand-charcoal-light">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-brand-charcoal-light">Tax</span>
              <span>${estimatedTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-brand-charcoal border-t border-brand-border pt-2 mt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <PaymentForm
            onSuccess={handlePaymentSuccess}
            total={total}
            invoiceNumber={invoiceNumber}
          />

          <button
            type="button"
            onClick={() => setStep(1)}
            className="btn-outline w-full py-3 mt-3"
          >
            Back
          </button>
        </Elements>
      )}

      {/* ── Step 3: Confirmation ── */}
      {step === 3 && (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto bg-brand-green-light rounded-full flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Order Confirmed!</h2>
          {invoiceNumber && (
            <p className="text-sm text-brand-charcoal-light mb-2">
              Order number: <span className="font-mono font-semibold text-brand-charcoal">{invoiceNumber}</span>
            </p>
          )}
          <p className="text-sm text-brand-charcoal-light mb-8 max-w-md mx-auto">
            Thank you for your order! We&apos;ve sent a confirmation to your email.
            Our team will reach out to schedule your {fulfillmentType === 'delivery' ? 'delivery' : 'pickup'}.
          </p>
          <Link href="/shop" className="btn-brand text-base px-8 py-3">
            Continue Shopping
          </Link>
        </div>
      )}
    </div>
  );
}
