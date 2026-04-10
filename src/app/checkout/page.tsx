'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { api, type AvailableSlot, type CheckAvailabilityResponse } from '@/lib/api';
import { loadStoredSlot, saveStoredSlot, clearStoredSlot } from '@/lib/deliverySlot';
import Link from 'next/link';

// Format a YYYY-MM-DD date as "Mon, Apr 13" etc. without pulling in a date
// library. Explicitly uses noon so DST shifts don't trip the day boundary.
function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });
}

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

  // Availability check state — tracks the /storefront/check-availability
  // roundtrip + the slot the customer picked. Response mirrors the backend
  // discriminated union so the JSX can switch on `availability?.status`.
  const [checkingAvail, setCheckingAvail]   = useState(false);
  const [availability, setAvailability]     = useState<CheckAvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot]     = useState<AvailableSlot | null>(null);
  const [availError, setAvailError]         = useState<string | null>(null);

  // Rehydrate a previously-picked slot from localStorage on mount. The
  // helper enforces both the 24h TTL and the 48h lead window, so by the
  // time we get a truthy result it's guaranteed still valid. Pre-fills
  // the address input + selectedSlot so the customer doesn't have to
  // re-pick if they already chose one on the product page or home widget.
  useEffect(() => {
    const stored = loadStoredSlot();
    if (stored) {
      setAddress(stored.address);
      setSelectedSlot({
        date:            stored.date,
        time_label:      stored.time_label,
        time_mins:       stored.time_mins,
        price:           stored.price,
        proximity_label: stored.proximity_label,
      });
      // Synthesize an availability response so the slot picker UI has
      // something to render. The list contains just the saved slot so
      // the customer can confirm it or click "Check Availability" again
      // to refresh.
      setAvailability({ status: 'in_range', slots: [{
        date:            stored.date,
        time_label:      stored.time_label,
        time_mins:       stored.time_mins,
        price:           stored.price,
        proximity_label: stored.proximity_label,
      }], lead_hours: 48 });
    }
  }, []);

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
      clearStoredSlot();
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

  // Step 2: Fulfillment — "Continue to Payment" button handler.
  function handleFulfillmentSubmit(e: FormEvent) {
    e.preventDefault();
    // Guard against accidental skips: delivery needs a confirmed slot
    // before we'll create a payment intent. Pickup doesn't need a slot
    // yet (Phase 2.B will add pickup date selection).
    if (fulfillmentType === 'delivery' && !selectedSlot) {
      setAvailError('Please check availability and pick a delivery slot before continuing.');
      return;
    }
    setAvailError(null);
    createPaymentIntent();
  }

  // Hit /storefront/check-availability with the entered address. Updates
  // the availability state with one of the four discriminated shapes; the
  // JSX in step 1 branches on status to render the right layout.
  async function runAvailabilityCheck() {
    const trimmed = address.trim();
    if (trimmed.length < 10) {
      setAvailError('Please enter a full street address (number, street, city, state, ZIP).');
      return;
    }
    setCheckingAvail(true);
    setAvailError(null);
    setSelectedSlot(null);
    clearStoredSlot();
    try {
      const resp = await api.checkAvailability(trimmed);
      setAvailability(resp);
    } catch (err) {
      console.error('[checkout] check-availability failed:', err);
      setAvailability(null);
      setAvailError('Unable to check availability right now. Please try again in a moment.');
    } finally {
      setCheckingAvail(false);
    }
  }

  // Called when the customer taps a specific slot chip. Persists to
  // localStorage with a 24h TTL so subsequent navigation (back to cart,
  // product page, etc.) remembers the choice.
  function handleSlotPick(slot: AvailableSlot) {
    setSelectedSlot(slot);
    saveStoredSlot({
      address:         address.trim(),
      date:            slot.date,
      time_label:      slot.time_label,
      time_mins:       slot.time_mins,
      price:           slot.price,
      proximity_label: slot.proximity_label,
    });
  }

  // Create payment intent when moving to payment step. Forwards the
  // selected delivery slot (date + time window + fee) so the backend
  // /store/order handler can create the invoice with the right delivery
  // metadata and the Stripe webhook can auto-create the delivery order
  // on successful payment.
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
            address: fulfillmentType === 'delivery' ? address.trim() : undefined,
            // Only include date/time when a slot is actually picked —
            // pickup path leaves these undefined for now (Phase 2.B).
            ...(selectedSlot && fulfillmentType === 'delivery' ? {
              date:        selectedSlot.date,
              time_window: selectedSlot.time_label,
            } : {}),
          },
          // Delivery fee comes from the picked slot for delivery orders,
          // zero for pickup.
          delivery_fee: fulfillmentType === 'delivery' && selectedSlot ? selectedSlot.price : 0,
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
    clearStoredSlot();
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">Delivery Address *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={e => {
                      setAddress(e.target.value);
                      // Invalidate any previous check when the address
                      // changes — prevents a stale slot from being
                      // submitted with a new address.
                      if (availability || selectedSlot) {
                        setAvailability(null);
                        setSelectedSlot(null);
                        clearStoredSlot();
                      }
                    }}
                    className="flex-1 border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                    placeholder="123 Main St, Birmingham, AL 35201"
                  />
                  <button
                    type="button"
                    onClick={runAvailabilityCheck}
                    disabled={checkingAvail || address.trim().length < 10}
                    className="btn-brand px-4 py-2.5 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {checkingAvail ? 'Checking…' : 'Check Availability'}
                  </button>
                </div>
                <p className="text-xs text-brand-charcoal-light mt-1">
                  We need at least 48 hours notice. Delivery is limited to addresses within 50 miles of Irondale.
                </p>
              </div>

              {availError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {availError}
                </div>
              )}

              {/* ── in_range: slot picker ───────────────────────────── */}
              {availability?.status === 'in_range' && availability.slots.length > 0 && (() => {
                // Group slots by date for a two-level layout: day header,
                // then a horizontal strip of time chips under it. Each
                // chip shows the time + the slot's quoted price so the
                // customer can shop across different days based on the
                // drive-time-tier pricing.
                const byDate = availability.slots.reduce<Record<string, AvailableSlot[]>>((acc, s) => {
                  (acc[s.date] ||= []).push(s);
                  return acc;
                }, {});
                const sortedDates = Object.keys(byDate).sort();
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-brand-charcoal">
                        Pick a delivery window
                      </p>
                      {selectedSlot && (
                        <p className="text-xs text-brand-green font-medium">
                          ✓ {formatDayLabel(selectedSlot.date)} @ {selectedSlot.time_label} — ${selectedSlot.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto rounded-lg border border-brand-border divide-y divide-brand-border">
                      {sortedDates.map(dateStr => (
                        <div key={dateStr} className="p-3">
                          <div className="text-xs font-semibold text-brand-charcoal mb-2">
                            {formatDayLabel(dateStr)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {byDate[dateStr].map(slot => {
                              const isPicked =
                                selectedSlot?.date === slot.date &&
                                selectedSlot?.time_mins === slot.time_mins;
                              return (
                                <button
                                  key={`${slot.date}-${slot.time_mins}`}
                                  type="button"
                                  onClick={() => handleSlotPick(slot)}
                                  className={`rounded-md border px-3 py-2 text-xs text-left transition-colors ${
                                    isPicked
                                      ? 'border-brand-yellow bg-brand-yellow-light font-semibold'
                                      : 'border-brand-border hover:border-brand-charcoal-light bg-white'
                                  }`}
                                >
                                  <div className="text-brand-charcoal">{slot.time_label}</div>
                                  <div className="text-brand-charcoal-light mt-0.5">
                                    ${slot.price.toFixed(2)}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── out_of_range: call us dead end ──────────────────── */}
              {availability?.status === 'out_of_range' && (
                <div className="rounded-lg border-2 border-brand-yellow bg-brand-yellow-light px-4 py-5 text-sm">
                  <p className="font-semibold text-brand-charcoal mb-2">
                    Outside our standard delivery range
                  </p>
                  <p className="text-brand-charcoal-light mb-3">
                    Your address is approximately {availability.distance_miles} miles from our Irondale store, which is outside our in-house delivery range.
                    We&apos;d love to help — please give us a call so we can discuss options.
                  </p>
                  <a
                    href={`tel:${availability.store_phone.replace(/\D/g, '')}`}
                    className="inline-block btn-brand text-base px-6 py-2.5"
                  >
                    📞 {availability.store_phone}
                  </a>
                </div>
              )}

              {/* ── geocode_failed: retry ───────────────────────────── */}
              {availability?.status === 'geocode_failed' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {availability.message}
                </div>
              )}

              {/* ── unavailable: no slots in window ─────────────────── */}
              {availability?.status === 'unavailable' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm">
                  <p className="font-semibold text-red-800 mb-1">No available delivery windows</p>
                  <p className="text-red-700 mb-2">{availability.message}</p>
                  {availability.store_phone && (
                    <a
                      href={`tel:${availability.store_phone.replace(/\D/g, '')}`}
                      className="text-red-800 underline font-semibold"
                    >
                      Call {availability.store_phone}
                    </a>
                  )}
                </div>
              )}
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
            <button
              type="submit"
              disabled={
                creatingIntent ||
                (fulfillmentType === 'delivery' && !selectedSlot)
              }
              className="btn-brand flex-1 py-3 disabled:opacity-50"
            >
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
