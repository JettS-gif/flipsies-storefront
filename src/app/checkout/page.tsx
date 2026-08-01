'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, type CartItem } from '@/context/CartContext';
import { canContinueFulfillment } from '@/lib/checkoutReadiness';
import { addDaysCT } from '@/lib/ct';
import { trackEvent } from '@/lib/analytics';
import { visitorId, track } from '@/lib/siteEvents';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { api, type AvailableSlot, type CheckAvailabilityResponse } from '@/lib/api';
import { loadStoredSlot, saveStoredSlot, clearStoredSlot } from '@/lib/deliverySlot';
import Link from 'next/link';

// GA4 purchase must survive the Stripe redirect-return, which reloads the
// page and clears cart + component state. So we stash the payload at
// intent-creation (cart still populated) and fire once from whichever
// success path runs — removed-before-fire guarantees exactly one event.
const PENDING_PURCHASE_KEY = 'flipsies_pending_purchase';

function toGaItems(items: CartItem[]) {
  return items.map((i) => ({
    item_id:       i.sku || i.product_id,
    item_name:     i.name,
    price:         i.price,
    quantity:      i.qty,
    item_category: i.category || undefined,
  }));
}

function firePurchase() {
  try {
    const raw = sessionStorage.getItem(PENDING_PURCHASE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_PURCHASE_KEY); // fire exactly once
    trackEvent('purchase', JSON.parse(raw));
  } catch { /* sessionStorage/JSON unavailable — skip */ }
}

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

  // Pickup state (Phase 2.B). Store defaults to Hoover because it's the
  // higher-traffic showroom; customers can switch to Irondale. The date
  // picker enforces a 2-calendar-day minimum via the HTML `min` attribute
  // so warehouse staff have at least 48 hours to stage the pick list
  // (same lead time rule the delivery path enforces for different
  // reasons). Time is a loose preset — "Any time" covers most customers,
  // specific windows help warehouse sequence the day.
  const [pickupStore, setPickupStore] = useState<'Hoover' | 'Irondale'>('Hoover');
  const [pickupDate,  setPickupDate]  = useState('');
  const [pickupTime,  setPickupTime]  = useState('Any time during business hours');

  // Minimum pickup date = today + 2 calendar days, in YYYY-MM-DD. Mirrors
  // the 48h rule from the storefront delivery path. Computed once per
  // render; cheap enough not to memoize.
  // CENTRAL, not the shopper's clock. This is a client component, so
  // `new Date()` was the CUSTOMER's timezone and `.toISOString()` then
  // converted it to UTC before slicing — so a Central shopper after 7pm got a
  // minimum a day later than the 48-hour rule requires, and valid pickup days
  // were silently unavailable. A shopper in another timezone got a different
  // answer again. The store's calendar is the only one that matters here.
  const minPickupDate = addDaysCT(2);

  // Pickups run only Tuesday / Thursday / Saturday. Noon-anchor the date-only
  // string so a TZ boundary can't shift the weekday. getDay(): 0=Sun … 6=Sat.
  function isPickupDay(ds: string): boolean {
    if (!ds || !/^\d{4}-\d{2}-\d{2}$/.test(ds)) return false;
    const d = new Date(`${ds}T12:00:00`);
    return !isNaN(d.getTime()) && [2, 4, 6].includes(d.getDay());
  }

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
      const rehydrated: AvailableSlot = {
        date:               stored.date,
        time_label:         stored.time_label,
        time_mins:          stored.time_mins,
        price:              stored.price,
        proximity_label:    stored.proximity_label,
        saturday_surcharge: stored.saturday_surcharge || 0,
      };
      setSelectedSlot(rehydrated);
      // Synthesize an availability response so the slot picker UI has
      // something to render. The list contains just the saved slot so
      // the customer can confirm it or click "Check Availability" again
      // to refresh.
      setAvailability({ status: 'in_range', slots: [rehydrated], lead_hours: 48 });
    }
  }, []);

  // Payment
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [total, setTotal] = useState(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  // 409 item_oversold response from /store/order. Surfaced as a
  // dedicated block so the customer can see exactly which SKUs sold
  // out and head back to the cart to drop them — never silently
  // converted to a 6-8 week backorder.
  const [oversoldItems, setOversoldItems] = useState<Array<{
    product_id: string;
    sku: string;
    requested: number;
    qty_available: number;
  }> | null>(null);

  // Handle return from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      firePurchase();
      clearCart();
      clearStoredSlot();
      setInvoiceNumber(params.get('invoice') || '');
      setStep(3);
      // Clean URL
      window.history.replaceState({}, '', '/checkout');
    }
  }, [clearCart]);

  // Fire GA4 begin_checkout once, the moment the cart has hydrated with
  // items (itemCount is 0 pre-hydration, so the ref-guard emits a single
  // event when items are first present rather than on every re-render).
  const beganCheckout = useRef(false);
  useEffect(() => {
    if (!beganCheckout.current && itemCount > 0) {
      beganCheckout.current = true;
      trackEvent('begin_checkout', {
        currency: 'USD',
        value:    subtotal,
        items:    toGaItems(items),
      });
      // Same event, first-party. Rides the existing guard so the two channels
      // agree on what counted as a checkout start, and carries the cart value
      // so the dashboard can show reached-checkout vs completed without
      // needing GA4 to answer it.
      track({ event_type: 'begin_checkout', payload: { value: subtotal, item_count: itemCount } });
    }
  }, [itemCount, subtotal, items]);

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

  // A made-to-order cart has no slot to pick: delivery is quoted and billed when
  // the item arrives, so "has a selected slot" is the wrong readiness test for it.
  const deliveryOnArrival = availability?.status === 'delivery_on_arrival';

  // SINGLE SOURCE for "may this cart continue to payment" — the submit handler
  // and the button's `disabled` prop both read this. The rule itself lives in
  // src/lib/checkoutReadiness.ts so it is unit-tested; see that file for why.
  const canContinue = canContinueFulfillment({
    fulfillmentType,
    hasSelectedSlot:   !!selectedSlot,
    deliveryOnArrival,
    hasPickupStore:    !!pickupStore,
    hasPickupDate:     !!pickupDate,
  });

  // Step 2: Fulfillment — "Continue to Payment" button handler.
  function handleFulfillmentSubmit(e: FormEvent) {
    e.preventDefault();
    // Guard against accidental skips: each fulfillment mode has its own
    // required fields before we'll create a payment intent.
    if (fulfillmentType === 'delivery' && !canContinue) {
      setAvailError(
        availability
          ? 'Please pick a delivery slot before continuing.'
          : 'Please check availability for your address before continuing.',
      );
      return;
    }
    if (fulfillmentType === 'pickup') {
      if (!pickupStore) {
        setAvailError('Please pick a store location (Hoover or Irondale).');
        return;
      }
      if (!pickupDate) {
        setAvailError('Please select a pickup date.');
        return;
      }
      // Extra belt-and-suspenders on the 48h lead rule — the HTML min
      // attribute handles it in the date picker, but a tampered client
      // could still submit an invalid date. The backend re-checks too.
      if (pickupDate < minPickupDate) {
        setAvailError('Pickup must be scheduled at least 48 hours in advance.');
        return;
      }
      // Pickups run only Tue / Thu / Sat. The backend re-checks (422), this is
      // the friendly client-side guard.
      if (!isPickupDay(pickupDate)) {
        setAvailError('Pickups are only available on Tuesday, Thursday, and Saturday.');
        return;
      }
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
      // Pass the cart's product ids so the backend can answer
      // `delivery_on_arrival` for a made-to-order cart rather than offering
      // slots we cannot honour. Package lines have no product_id and are
      // expanded server-side at submit, so they're simply omitted here.
      const productIds = items.map(i => i.product_id).filter(Boolean) as string[];
      // Lines the fabric wizard configured must be judged on the CHOSEN
      // fabric's stock, not the frame's. Without this a made-to-order colourway
      // on a stocked frame was offered real dated slots (2026-07-31).
      const fabricPairs = items
        .filter(i => i.product_id && i.fabric_id)
        .map(i => `${i.product_id}:${i.fabric_id}`);
      const resp = await api.checkAvailability(trimmed, productIds, fabricPairs);
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
      address:            address.trim(),
      date:               slot.date,
      time_label:         slot.time_label,
      time_mins:          slot.time_mins,
      price:              slot.price,
      proximity_label:    slot.proximity_label,
      saturday_surcharge: slot.saturday_surcharge || 0,
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
    setOversoldItems(null);

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // A package line posts { package_id, qty } and nothing else — the
          // backend expands it into component lines and re-derives the price
          // from the packages row, so anything we sent would be ignored.
          items: items.map(i => (
            i.package_id
              ? { package_id: i.package_id, qty: i.qty }
              : {
                  product_id: i.product_id,
                  sku: i.sku,
                  name: i.name,
                  price: i.price,
                  qty: i.qty,
                  // Made-to-order fabric pick — the backend mints/swaps the
                  // fabric child and prices it off the frame's grade map.
                  ...(i.fabric_id ? {
                    fabric_id: i.fabric_id,
                    // Colourway id — the backend validates it against the named
                    // fabric and derives the label from the catalog, so the
                    // colourway lands in the invoice and the minted child's
                    // `color` rather than surviving only as this display string.
                    ...(i.fabric_color_id ? { fabric_color_id: i.fabric_color_id } : {}),
                    fabric_name: i.fabric_name,
                  } : {}),
                }
          )),
          customer: { name, email, phone: phone || undefined },
          fulfillment: {
            type: fulfillmentType,
            // Delivery path sends the typed address. Pickup path sends
            // the selected store's address so the invoice detail view
            // in DeliverDesk shows a meaningful location instead of
            // a blank line.
            address: fulfillmentType === 'delivery'
              ? address.trim()
              : (pickupStore === 'Hoover'
                  ? '1709 Montgomery Hwy S, Hoover, AL 35244 (in-store pickup)'
                  : '1811 Crestwood Blvd, Irondale, AL 35210 (in-store pickup)'),
            // Delivery path uses the slot's date + time_window.
            // Pickup path uses the picker + preset time preference.
            ...(selectedSlot && fulfillmentType === 'delivery' ? {
              date:        selectedSlot.date,
              time_window: selectedSlot.time_label,
            } : {}),
            ...(fulfillmentType === 'pickup' && pickupDate ? {
              date:        pickupDate,
              time_window: pickupTime,
              store:       pickupStore,
            } : {}),
          },
          // Delivery fee comes from the picked slot for delivery orders,
          // zero for pickup.
          delivery_fee: fulfillmentType === 'delivery' && selectedSlot ? selectedSlot.price : 0,
          // First-party attribution: carries this browser's visitor id onto the
          // invoice so a sale can be joined back to the traffic that produced
          // it. Best-effort — a shopper with storage disabled sends nothing and
          // the order proceeds exactly as before.
          visitor_id: visitorId(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409 && err.error === 'item_oversold' && Array.isArray(err.items)) {
          setOversoldItems(err.items);
          return;
        }
        // `message` first — the backend ships a human sentence there, naming the
        // offending items where it can. `error` is the raw code, so reading it
        // first showed customers strings like "items_require_fabric_code" with
        // nothing actionable in them.
        throw new Error(err.message || err.detail || err.error || 'Failed to create order');
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setInvoiceNumber(data.invoice_number);
      setTotal(data.total);
      // Stash the GA4 purchase payload now, while the cart is still
      // populated and we hold the authoritative backend total — it must
      // outlive the Stripe redirect-return that clears cart + page state.
      try {
        sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify({
          transaction_id: data.invoice_number,
          value:          data.total,
          currency:       'USD',
          items:          toGaItems(items),
        }));
      } catch { /* sessionStorage unavailable — purchase event just won't fire */ }
      setStep(2);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreatingIntent(false);
    }
  }

  function handlePaymentSuccess() {
    firePurchase();
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
              <p className="font-semibold text-brand-charcoal mt-1">In-Store Pickup</p>
              <p className="text-xs text-brand-charcoal-light">Free — Hoover or Irondale</p>
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

              {/* ── delivery_on_arrival: made-to-order, no slot to pick ── */}
              {availability?.status === 'delivery_on_arrival' && (
                <div className="rounded-lg border border-brand-yellow bg-brand-yellow/10 px-4 py-4 text-sm">
                  <p className="font-semibold text-brand-charcoal mb-1">
                    {availability.mixed
                      ? 'We’ll call you to arrange delivery'
                      : 'We’ll schedule delivery when your order arrives'}
                  </p>
                  <p className="text-brand-charcoal-light mb-2">{availability.message}</p>
                  {/* On a mixed cart, name BOTH groups. "Some items are ready
                      now" is only reassuring if the customer can see which. */}
                  {availability.mixed && availability.in_stock_items.length > 0 && (
                    <>
                      <p className="font-medium text-brand-charcoal mb-1">Ready now</p>
                      <ul className="mb-2 list-disc pl-5 text-brand-charcoal-light">
                        {availability.in_stock_items.map(it => (
                          <li key={it.sku}>{it.name} <span className="opacity-70">({it.sku})</span></li>
                        ))}
                      </ul>
                    </>
                  )}
                  {availability.special_orders.length > 0 && (
                    <>
                      {availability.mixed && (
                        <p className="font-medium text-brand-charcoal mb-1">Made to order (6-8 weeks)</p>
                      )}
                      <ul className="mb-2 list-disc pl-5 text-brand-charcoal-light">
                        {availability.special_orders.map(it => (
                          <li key={it.sku}>{it.name} <span className="opacity-70">({it.sku})</span></li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="text-brand-charcoal-light">
                    <span className="font-semibold">No delivery charge today.</span>{' '}
                    {availability.mixed
                      ? 'We’ll quote the fee when we speak — it depends on whether you’d like one delivery or two.'
                      : 'We’ll quote the fee for your address and collect it when we book your delivery.'}
                  </p>
                  {availability.store_phone && (
                    <p className="mt-2 text-brand-charcoal-light">
                      Questions?{' '}
                      <a
                        href={`tel:${availability.store_phone.replace(/\D/g, '')}`}
                        className="underline font-semibold text-brand-charcoal"
                      >
                        Call {availability.store_phone}
                      </a>
                    </p>
                  )}
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
            <div className="space-y-4">
              {/* Store selector — 2 showrooms, defaulted to Hoover */}
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-2">
                  Pick up from
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPickupStore('Hoover')}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      pickupStore === 'Hoover'
                        ? 'border-brand-yellow bg-brand-yellow-light'
                        : 'border-brand-border hover:border-brand-charcoal-light'
                    }`}
                  >
                    <p className="font-semibold text-brand-charcoal">Hoover Showroom</p>
                    <p className="text-xs text-brand-charcoal-light mt-1">
                      1709 Montgomery Hwy S<br />Hoover, AL 35244
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupStore('Irondale')}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      pickupStore === 'Irondale'
                        ? 'border-brand-yellow bg-brand-yellow-light'
                        : 'border-brand-border hover:border-brand-charcoal-light'
                    }`}
                  >
                    <p className="font-semibold text-brand-charcoal">Irondale Showroom</p>
                    <p className="text-xs text-brand-charcoal-light mt-1">
                      1811 Crestwood Blvd<br />Irondale, AL 35210
                    </p>
                  </button>
                </div>
              </div>

              {/* Date picker — enforces 48h lead via min attribute */}
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">
                  Pickup date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  min={minPickupDate}
                  onChange={e => {
                    setPickupDate(e.target.value);
                    setAvailError(
                      e.target.value && !isPickupDay(e.target.value)
                        ? 'Pickups are only available on Tuesday, Thursday, and Saturday.'
                        : null,
                    );
                  }}
                  className={`w-full sm:w-64 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow ${
                    pickupDate && !isPickupDay(pickupDate) ? 'border-red-500' : 'border-brand-border'
                  }`}
                />
                <p className="text-xs text-brand-charcoal-light mt-1">
                  Pickups are available Tuesday, Thursday, and Saturday — at least 48 hours out.
                </p>
              </div>

              {/* Time preference — preset windows, defaults to "Any time" */}
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">
                  Pickup time preference
                </label>
                <select
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                  className="w-full sm:w-80 border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                >
                  <option>Any time during business hours</option>
                  <option>Morning (10:00 AM - 12:00 PM)</option>
                  <option>Early afternoon (12:00 PM - 2:00 PM)</option>
                  <option>Late afternoon (2:00 PM - 5:00 PM)</option>
                </select>
                <p className="text-xs text-brand-charcoal-light mt-1">
                  Our warehouse team will have your order staged and ready during your preferred window.
                </p>
              </div>

              {/* Free callout */}
              <div className="bg-brand-green-light border border-brand-green rounded-lg px-4 py-3 text-sm text-brand-green">
                <strong>Free</strong> — no delivery charge on in-store pickup. Bring a truck or SUV for larger pieces.
              </div>
            </div>
          )}

          {paymentError && (
            <p className="text-sm text-red-500">{paymentError}</p>
          )}

          {oversoldItems && oversoldItems.length > 0 && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-4 text-sm">
              <p className="font-semibold text-red-800 mb-2">
                Some items just sold out
              </p>
              <p className="text-red-700 mb-3">
                The following {oversoldItems.length === 1 ? 'item' : 'items'} were available when you added {oversoldItems.length === 1 ? 'it' : 'them'} to your cart but a parallel order took the last {oversoldItems.length === 1 ? 'unit' : 'units'}. Please head back to your cart to remove or adjust.
              </p>
              <ul className="list-disc list-inside text-red-700 mb-3 font-mono text-xs">
                {oversoldItems.map(it => (
                  <li key={it.product_id}>
                    {it.sku} — requested {it.requested}, {it.qty_available} left
                  </li>
                ))}
              </ul>
              <Link href="/cart" className="btn-brand inline-block text-sm px-4 py-2">
                Back to Cart
              </Link>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setStep(0)} className="btn-outline flex-1 py-3">
              Back
            </button>
            <button
              type="submit"
              // Reads the same predicate as handleFulfillmentSubmit — see
              // canContinueFulfillment. Do not re-inline the condition here: a
              // disabled button never fires its handler, so a divergence between
              // the two silently blocks the sale with no error on screen.
              disabled={creatingIntent || !canContinue}
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
            {/* Delivery fee line only when a slot is actually picked on
                the delivery path. Pickup and empty-slot orders omit it. */}
            {selectedSlot && fulfillmentType === 'delivery' && (
              <>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brand-charcoal-light">
                    Delivery — {formatDayLabel(selectedSlot.date)} @ {selectedSlot.time_label}
                  </span>
                  <span>${selectedSlot.price.toFixed(2)}</span>
                </div>
                {selectedSlot.saturday_surcharge && selectedSlot.saturday_surcharge > 0 && (
                  <div className="flex justify-between text-xs text-brand-charcoal-light mb-1 pl-3">
                    <span>↳ includes ${selectedSlot.saturday_surcharge} weekend fee</span>
                  </div>
                )}
              </>
            )}
            {/* Made-to-order: no fee is charged now, but say so rather than
                silently omitting the line — an absent delivery row on a
                delivery order reads as "delivery is free", which it isn't. */}
            {deliveryOnArrival && fulfillmentType === 'delivery' && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-brand-charcoal-light">Delivery</span>
                <span className="text-brand-charcoal-light">
                  {availability?.status === 'delivery_on_arrival' && availability.mixed
                    ? 'We’ll call to arrange'
                    : 'Quoted on arrival'}
                </span>
              </div>
            )}
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
            Thank you for your order! A confirmation is on its way to{' '}
            {email ? <span className="font-semibold text-brand-charcoal">{email}</span> : 'your email'}.
            {' '}Our team will reach out to confirm your {fulfillmentType === 'delivery' ? 'delivery' : 'pickup'}.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {invoiceNumber && email && (
              <Link
                href={`/track-order?invoice=${encodeURIComponent(invoiceNumber)}&email=${encodeURIComponent(email)}`}
                className="btn-brand text-base px-8 py-3"
              >
                Track Your Order
              </Link>
            )}
            <Link href="/shop" className="btn-outline text-base px-8 py-3">
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
