'use client';

import { Suspense, useState, useEffect, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type TrackOrderResponse } from '@/lib/api';

// Map backend fulfillment_status values to short customer-friendly
// labels. Anything we don't recognize falls through to a humanized
// version of the raw string.
const STATUS_LABELS: Record<string, string> = {
  pending:        'Confirmed — preparing for delivery',
  scheduled:      'Scheduled',
  on_hold:        'Hold — staged for your delivery',
  on_hold_co:     'On hold — completing custom order',
  needs_ordered:  'Ordering from manufacturer',
  ordered:        'Ordered — awaiting vendor shipment',
  in_warehouse:   'Arrived at warehouse',
  delivered:      'Delivered',
  picked_up:      'Picked up',
  cancelled:      'Cancelled',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  active:               'Active',
  partial:              'Partially paid',
  paid:                 'Paid',
  scheduled:            'Scheduled',
  en_route:             'Out for delivery',
  delivered:            'Delivered',
  picked_up:            'Picked up',
  partially_fulfilled:  'Partially fulfilled',
  partially_returned:   'Partially returned',
  returned:             'Returned',
  cancelled:            'Cancelled',
  voided:               'Voided',
};

function humanize(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(ds: string | null): string {
  if (!ds) return '—';
  const d = new Date(`${ds}T12:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState(searchParams.get('invoice') || '');
  const [email,   setEmail]   = useState(searchParams.get('email')   || '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<TrackOrderResponse | null>(null);

  async function runLookup(invoiceArg: string, emailArg: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.trackOrder(invoiceArg.trim(), emailArg.trim());
      setResult(data);
    } catch {
      // 404 from the backend means either unknown invoice OR email
      // mismatch — surface the same generic message either way so we
      // don't help an attacker enumerate valid invoice numbers.
      setError('We couldn’t find an order matching that invoice number and email. Double-check both and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-lookup when both fields are present in the URL — supports
  // ?invoice=...&email=... links from the confirmation page or an
  // email follow-up.
  useEffect(() => {
    if (invoice && email && !result && !loading && !error) {
      runLookup(invoice, email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invoice.trim() || !email.trim()) return;
    runLookup(invoice, email);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-brand-charcoal">Track Your Order</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">
          Enter the order number from your confirmation email and the email address you used at checkout.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-brand-charcoal mb-1">
            Order Number *
          </label>
          <input
            type="text"
            required
            value={invoice}
            onChange={e => setInvoice(e.target.value)}
            placeholder="WEB-20260604-1234"
            className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-yellow"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-charcoal mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-brand w-full text-base py-3 disabled:opacity-50"
        >
          {loading ? 'Looking up…' : 'Track Order'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-mono text-brand-charcoal-light uppercase tracking-wider mb-1">
              {result.invoice_number}
            </p>
            <h2 className="text-xl font-semibold text-brand-charcoal">
              {INVOICE_STATUS_LABELS[result.status] || humanize(result.status)}
            </h2>
            <p className="text-sm text-brand-charcoal-light mt-1">
              {result.customer_name}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 bg-brand-warm-gray rounded-lg p-4">
            <div>
              <p className="text-xs font-medium text-brand-charcoal-light uppercase tracking-wider mb-1">
                {result.delivery_mode === 'pickup' ? 'Pickup' : 'Delivery'}
              </p>
              <p className="text-sm text-brand-charcoal">
                {fmtDate(result.delivery_date)}
              </p>
              {result.delivery_time && (
                <p className="text-xs text-brand-charcoal-light mt-0.5">
                  {result.delivery_time}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-brand-charcoal-light uppercase tracking-wider mb-1">
                Payment
              </p>
              <p className="text-sm text-brand-charcoal">
                ${result.amount_paid.toFixed(2)} of ${result.total.toFixed(2)}
              </p>
              {result.amount_paid >= result.total && (
                <p className="text-xs text-brand-green font-medium mt-0.5">Paid in full</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-3">
              Items
            </h3>
            <ul className="divide-y divide-brand-border border-y border-brand-border">
              {result.items.map((it, i) => (
                <li key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-charcoal truncate">
                      {it.name || it.sku}
                    </p>
                    <p className="text-xs text-brand-charcoal-light mt-0.5 font-mono">
                      {it.sku} · qty {it.qty}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                    it.fulfillment_status === 'delivered' || it.fulfillment_status === 'picked_up'
                      ? 'bg-brand-green-light text-brand-green'
                      : it.fulfillment_status === 'cancelled'
                        ? 'bg-red-50 text-red-700'
                        : it.needs_po
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-brand-warm-gray text-brand-charcoal-light'
                  }`}>
                    {STATUS_LABELS[it.fulfillment_status] || humanize(it.fulfillment_status)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center pt-4 border-t border-brand-border">
            <p className="text-xs text-brand-charcoal-light mb-3">
              Questions about your order? Call us at{' '}
              <a href="tel:2052385076" className="text-brand-yellow-dark hover:underline font-medium">
                (205) 238-5076
              </a>
            </p>
            <Link href="/" className="btn-outline text-sm">Back to Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// useSearchParams() reads request-time state, so Next requires it inside a
// Suspense boundary — without one the whole page fails static prerender at
// build time. The fallback is the same page shell the content renders into.
export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-brand-charcoal">Track Your Order</h1>
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
