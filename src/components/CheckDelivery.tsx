'use client';

// ── CheckDelivery widget ───────────────────────────────────────────────────
// Home-page "Can you deliver to my address?" tool. Captures customer name
// and contact info alongside the address so the office can follow up on
// out-of-range inquiries manually. Calls POST /storefront/leads which
// does two things atomically: persist the lead row for the Inquiries
// admin view, and return the full availability result.
//
// Three important things this widget does NOT do, by design:
//   1. Does not save the picked slot to localStorage (that's the
//      checkout page's job; this widget is informational only).
//   2. Does not let the customer "book" a slot — the only CTA on
//      success is "Browse products to buy", which funnels them into
//      the real cart + checkout flow.
//   3. Does not block out-of-range customers — it captures their info
//      and shows a friendly "we'll reach out" message. Those leads are
//      high-value because the office can arrange third-party shipping
//      or other options that a self-service checkout can't.

import { useState, type FormEvent } from 'react';
import { api, type LeadCaptureResponse, type AvailableSlot } from '@/lib/api';
import Link from 'next/link';

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });
}

export default function CheckDelivery() {
  // Form fields
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<LeadCaptureResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation mirrors the server-side guards in
    // POST /storefront/leads so the user gets an inline error instead
    // of a round-trip 400 response.
    const trimmedName    = name.trim();
    const trimmedAddress = address.trim();
    const trimmedEmail   = email.trim();
    const trimmedPhone   = phone.trim();

    if (trimmedName.length < 2) {
      setError('Please enter your name so we know who to contact.');
      return;
    }
    if (!trimmedEmail && !trimmedPhone) {
      setError('Please give us at least one way to reach you — an email or a phone number.');
      return;
    }
    if (trimmedAddress.length < 10) {
      setError('Please enter a full street address including city, state, and ZIP.');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await api.createLead({
        name:    trimmedName,
        email:   trimmedEmail || undefined,
        phone:   trimmedPhone || undefined,
        address: trimmedAddress,
        source:  'home_widget',
      });
      setResult(resp);
    } catch (err) {
      console.error('[CheckDelivery] createLead failed:', err);
      const e = err as { error?: string; message?: string };
      // 429 from the rate limiter has a specific message worth surfacing.
      if (e?.error === 'too_many_attempts') {
        setError(e.message || 'Too many attempts. Please wait a few minutes and try again.');
      } else {
        setError(
          "We couldn't submit your inquiry right now. Please try again in a moment, or call us at (205) 238-5076."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    // Let the customer re-check a different address without a page reload.
    // Name + contact persist so they don't re-type; only the result and
    // address are cleared. This is the "check another address" path.
    setResult(null);
    setError(null);
  }

  // ── Render ─────────────────────────────────────────────────────────
  // Three top-level states:
  //   1. No result yet → render the form
  //   2. Result returned → render one of four availability variants
  //   3. Error state    → error banner inside the form, form still submittable

  if (!result) {
    return (
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm max-w-3xl mx-auto"
      >
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-brand-charcoal">
            Can we deliver to you?
          </h2>
          <p className="text-sm text-brand-charcoal-light mt-1">
            Enter your address and we&apos;ll show you available delivery dates and pricing.
            Outside our standard range? We&apos;ll still reach out to help.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">
              Phone <span className="text-brand-charcoal-light text-xs">(or email)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(205) 555-0123"
              className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-brand-charcoal mb-1">
            Email <span className="text-brand-charcoal-light text-xs">(or phone)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
          />
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-brand-charcoal mb-1">
            Delivery address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Main St, Birmingham, AL 35210"
            className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
          />
          <p className="text-xs text-brand-charcoal-light mt-1">
            We deliver within 50 miles of our Irondale location. Further out? Still enter your address — we&apos;ll follow up.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-brand w-full sm:w-auto px-8 py-3 text-base disabled:opacity-50"
        >
          {submitting ? 'Checking…' : 'Check Delivery Availability'}
        </button>

        <p className="text-xs text-brand-charcoal-light mt-4">
          By submitting, you agree to be contacted by our team about your inquiry.
          We don&apos;t share your info and we don&apos;t spam.
        </p>
      </form>
    );
  }

  // ── Result states ──────────────────────────────────────────────────
  const { availability } = result;

  // Shared "check another address" action bar at the bottom of every
  // result card.
  const FooterActions = (
    <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-brand-border">
      <Link href="/shop" className="btn-brand text-base px-6 py-3 text-center flex-1">
        Browse furniture
      </Link>
      <button
        type="button"
        onClick={handleReset}
        className="btn-outline text-base px-6 py-3 flex-1"
      >
        Check another address
      </button>
    </div>
  );

  // ── in_range: slot preview table ───────────────────────────────────
  if (availability.status === 'in_range') {
    // Group slots by date so the preview is scannable. Show the cheapest
    // slot per day to avoid overwhelming the customer — if they want the
    // full breakdown they can go through checkout. This is an INFO card,
    // not a picker.
    const byDate = availability.slots.reduce<Record<string, AvailableSlot[]>>((acc, s) => {
      (acc[s.date] ||= []).push(s);
      return acc;
    }, {});
    const sortedDates = Object.keys(byDate).sort();
    const previewDates = sortedDates.slice(0, 7); // First 7 days is enough for the preview

    const globalMin = availability.slots.reduce(
      (m, s) => (s.price < m ? s.price : m),
      availability.slots[0].price
    );

    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm max-w-3xl mx-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-green-light flex items-center justify-center flex-shrink-0 text-brand-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-charcoal">
              Yes — we deliver to you!
            </h2>
            <p className="text-sm text-brand-charcoal-light mt-1">
              Delivery starts at <span className="font-semibold text-brand-charcoal">${globalMin.toFixed(2)}</span>. Here&apos;s what&apos;s available over the next week:
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-brand-border divide-y divide-brand-border mb-2">
          {previewDates.map(dateStr => {
            const slotsForDay = byDate[dateStr];
            const cheapest    = slotsForDay.reduce((m, s) => (s.price < m.price ? s : m), slotsForDay[0]);
            const slotCount   = slotsForDay.length;
            return (
              <div key={dateStr} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-brand-charcoal">
                    {formatDayLabel(dateStr)}
                  </div>
                  <div className="text-xs text-brand-charcoal-light">
                    {slotCount} window{slotCount === 1 ? '' : 's'} available · {cheapest.proximity_label}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-brand-charcoal">
                    ${cheapest.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-brand-charcoal-light">from</div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-brand-charcoal-light">
          Pricing varies by time of day and delivery area. Final price is locked in at checkout.
          Deliveries need {availability.lead_hours}+ hours notice.
        </p>

        {FooterActions}
      </div>
    );
  }

  // ── out_of_range: still captured, friendly message ─────────────────
  if (availability.status === 'out_of_range') {
    return (
      <div className="bg-white rounded-2xl border-2 border-brand-yellow p-6 sm:p-8 shadow-sm max-w-3xl mx-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-yellow-light flex items-center justify-center flex-shrink-0 text-2xl">
            📞
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-charcoal">
              A bit out of our standard range
            </h2>
            <p className="text-sm text-brand-charcoal-light mt-1">
              Your address is about <span className="font-semibold text-brand-charcoal">{availability.distance_miles} miles</span> from our Irondale showroom — outside our everyday delivery range, but don&apos;t worry.
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-brand-warm-gray px-4 py-4 text-sm text-brand-charcoal mb-2">
          <p className="mb-2">
            <strong>We&apos;ve saved your info</strong> and someone from our team will reach out to discuss options — third-party freight, white-glove, or meet-halfway pickup.
          </p>
          <p>
            Want to talk now? Call us at{' '}
            <a href={`tel:${availability.store_phone.replace(/\D/g, '')}`} className="font-semibold text-brand-yellow-dark underline">
              {availability.store_phone}
            </a>
          </p>
        </div>
        {FooterActions}
      </div>
    );
  }

  // ── geocode_failed: still captured, softer prompt ──────────────────
  if (availability.status === 'geocode_failed') {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 shadow-sm max-w-3xl mx-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-2xl">
            📍
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-charcoal">
              We couldn&apos;t find that address
            </h2>
            <p className="text-sm text-brand-charcoal-light mt-1">
              {availability.message}
            </p>
          </div>
        </div>
        {FooterActions}
      </div>
    );
  }

  // ── unavailable: no slots in the 3-week window ─────────────────────
  return (
    <div className="bg-white rounded-2xl border border-red-200 p-6 sm:p-8 shadow-sm max-w-3xl mx-auto">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 text-2xl">
          ⏳
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-charcoal">
            No immediate windows
          </h2>
          <p className="text-sm text-brand-charcoal-light mt-1">
            {availability.message}
          </p>
        </div>
      </div>
      {availability.store_phone && (
        <div className="rounded-lg bg-brand-warm-gray px-4 py-3 text-sm text-brand-charcoal mb-2">
          Call us directly at{' '}
          <a href={`tel:${availability.store_phone.replace(/\D/g, '')}`} className="font-semibold text-brand-yellow-dark underline">
            {availability.store_phone}
          </a>{' '}
          and we&apos;ll arrange something custom.
        </div>
      )}
      {FooterActions}
    </div>
  );
}
