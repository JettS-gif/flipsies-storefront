'use client';

// ShippingQuoteRequest — what an out-of-radius shopper sees instead of a dead end.
//
// Until 2026-09-23 checkout told anyone past 100 miles to phone the store and
// stopped there. The business ships: Fort Worth, Warrensburg and Milton all
// went out in September at roughly $1,195 of merchandise plus $343 of freight.
// And the demand is measured, not assumed — 63 of 177 captured leads are
// outside the radius, averaging 868 miles, 43 of them inside 1,000 miles where
// LTL is still economic. One customer 958 miles away reached this exact screen,
// phoned, and bought. The sale survived because she called; this is so the next
// one does not have to.
//
// Two deliberate restraints in the copy:
//
//   1. No published rate. Freight ran 23-39% of ticket across the three real
//      shipments — too variable to post a number we would then have to defend.
//   2. "Usually about a week" is an ESTIMATE, not a promise (Jett: "I don't
//      think it should be a guarantee but it's a solid estimate"). A retailer
//      whose About page promises no fake sales does not get to invent a
//      delivery guarantee either, and the honest version still beats every
//      national's published SLA.

import { useState } from 'react';
import { api } from '@/lib/api';

const ECONOMIC_MILES = 1000;

export interface ShippingQuoteCartLine {
  sku?: string;
  name?: string;
  qty?: number;
  unit_price?: number;
}

interface Props {
  distanceMiles?: number;
  storePhone: string;
  /** Prefilled from whatever checkout already collected — never re-ask. */
  defaults?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  cart?: ShippingQuoteCartLine[];
  cartTotal?: number;
}

export default function ShippingQuoteRequest({
  distanceMiles,
  storePhone,
  defaults = {},
  cart = [],
  cartTotal,
}: Props) {
  const [name, setName]   = useState(defaults.name  ?? '');
  const [email, setEmail] = useState(defaults.email ?? '');
  const [phone, setPhone] = useState(defaults.phone ?? '');
  const [note, setNote]   = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const far = distanceMiles != null && distanceMiles > ECONOMIC_MILES;
  const tel = storePhone.replace(/\D/g, '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setError('Add an email address or a phone number so we can send the quote.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.requestShippingQuote({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: defaults.address,
        city: defaults.city,
        state: defaults.state,
        zip: defaults.zip,
        distance_miles: distanceMiles,
        cart,
        cart_total: cartTotal,
        customer_note: note.trim() || undefined,
      });
      setSent(true);
    } catch {
      // Never strand them: the phone number is always the fallback, and it is
      // right there in the error.
      setError('That didn’t send. Please try again, or call us and we’ll quote it on the spot.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border-2 border-brand-green bg-brand-green/5 px-4 py-5 text-sm">
        <p className="font-semibold text-brand-charcoal mb-2">Got it — we’ll be in touch with a shipping quote.</p>
        <p className="text-brand-charcoal-light">
          We’ve saved your cart with the request, so you won’t need to build it again.
          If you’d rather sort it now, call us at{' '}
          <a href={`tel:${tel}`} className="underline font-medium">{storePhone}</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-brand-yellow bg-brand-yellow-light px-4 py-5 text-sm">
      <p className="font-semibold text-brand-charcoal mb-2">
        We ship nationwide — let’s get you a freight quote
      </p>

      <p className="text-brand-charcoal-light mb-3">
        You’re about {distanceMiles != null ? `${Math.round(distanceMiles)} miles` : 'outside'} from our
        showrooms, so this is past our own delivery trucks. We ship anywhere in the lower 48 by freight
        instead.{' '}
        {far ? (
          <>
            At this distance freight can get expensive, and we’d rather tell you that up front than
            after you’ve waited on a number. Send the request and we’ll price it honestly — if it
            doesn’t make sense, we’ll say so.
          </>
        ) : (
          <>
            For pieces we have in stock, delivery is usually about a week — a day or two to reach the
            freight line, then two or three days on the road. That’s typical, not a guarantee.
          </>
        )}
      </p>

      <p className="text-brand-charcoal-light mb-4">
        Freight depends on size, weight and where it’s going, so we quote it rather than guess.
        Tell us where to send it and we’ll come back with a real number.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-brand-charcoal/20 px-3 py-2"
          />
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full rounded-md border border-brand-charcoal/20 px-3 py-2"
          />
        </div>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-md border border-brand-charcoal/20 px-3 py-2"
        />
        <textarea
          value={note} onChange={e => setNote(e.target.value)}
          placeholder="Anything we should know? (delivery access, timing, stairs…)"
          rows={2}
          className="w-full rounded-md border border-brand-charcoal/20 px-3 py-2"
        />

        {error && <p className="text-red-700">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit" disabled={sending}
            className="btn-brand text-base px-6 py-2.5 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Request a shipping quote'}
          </button>
          <a href={`tel:${tel}`} className="text-brand-charcoal-light underline">
            or call {storePhone}
          </a>
        </div>
      </form>
    </div>
  );
}
