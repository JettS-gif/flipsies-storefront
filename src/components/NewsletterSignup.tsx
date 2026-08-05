'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

// Footer marketing-list signup (S15).
//
// The offer is deliberately NOT a discount. Every comp opens with "10% off your
// first order", and we spent this week taking compare-at pricing off the site
// precisely because a manufactured discount contradicts the everyday-low-price
// position. So the incentive is things we can give away that cost nothing and
// that a discounter cannot match: first look at new arrivals, clearance before
// the floor sees it, and priority on delivery slots (Jett, 2026-08-05).
//
// SMS is a SECOND, separate tick. Marketing texts need express written consent,
// so it can never ride along with an email address — and the label has to say
// what they are agreeing to receive, not just "sign me up".

const BENEFITS = [
  'First look at new arrivals',
  'Clearance before it hits the floor',
  'Priority on delivery slots',
];

// Read once at submit rather than on mount: a visitor can land on a UTM'd URL
// and browse for ten minutes before subscribing, and Next's client router keeps
// the params on the URL the whole time.
function utmParams() {
  if (typeof window === 'undefined') return {};
  try {
    const q = new URLSearchParams(window.location.search);
    const pick = (k: string) => q.get(k) || undefined;
    return { utm_source: pick('utm_source'), utm_medium: pick('utm_medium'), utm_campaign: pick('utm_campaign') };
  } catch {
    return {};
  }
}

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    // The server rejects this too, but catching it here avoids a round trip and
    // explains it next to the box they need to fix.
    if (smsOptIn && phone.trim().length < 10) {
      setError('Add a mobile number for texts, or untick that box.');
      return;
    }

    setState('sending');
    try {
      await api.subscribe({
        email: cleanEmail,
        phone: phone.trim() || undefined,
        sms_opt_in: smsOptIn,
        source: 'footer',
        ...utmParams(),
      });
      setState('done');
      trackEvent('generate_lead', { source: 'footer_newsletter', sms_opt_in: smsOptIn });
    } catch (err) {
      const e2 = err as { error?: string; message?: string };
      setError(e2?.message || 'Something went wrong. Please try again in a moment.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-gray-300">You&apos;re on the list</h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Thanks — we&apos;ll let you know when something good lands.
          {smsOptIn ? ' Reply STOP to any text to opt out.' : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 md:items-start">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-gray-300">Get first look</h3>
        <ul className="space-y-1">
          {BENEFITS.map((b) => (
            <li key={b} className="text-sm text-gray-400 flex items-start gap-2">
              <span aria-hidden="true" className="text-brand-yellow mt-0.5 shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={onSubmit} noValidate className="max-w-sm w-full md:justify-self-end">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input
          id="nl-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg bg-white/10 border border-gray-600 px-3 py-2 text-sm text-white
            placeholder:text-gray-500 focus:outline-none focus:border-brand-yellow"
        />

        <label className="mt-3 flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={smsOptIn}
            onChange={(e) => setSmsOptIn(e.target.checked)}
            className="mt-0.5 shrink-0 accent-brand-yellow"
          />
          <span className="text-xs text-gray-400 leading-snug">
            Text me too — new arrivals and delivery slots. Message and data rates may apply;
            reply STOP any time.
          </span>
        </label>

        {smsOptIn && (
          <>
            <label htmlFor="nl-phone" className="sr-only">Mobile number</label>
            <input
              id="nl-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(205) 555-0123"
              className="mt-2 w-full rounded-lg bg-white/10 border border-gray-600 px-3 py-2 text-sm text-white
                placeholder:text-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </>
        )}

        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={state === 'sending'}
          className="mt-3 w-full rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-charcoal
            hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {state === 'sending' ? 'Signing you up…' : 'Sign me up'}
        </button>
        <p className="mt-2 text-[11px] text-gray-500 leading-snug">
          No spam, and we never sell your details. Unsubscribe from any email.
        </p>
      </form>
    </div>
  );
}
