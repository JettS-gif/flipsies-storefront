'use client';

// ── Staff login (Phase 3.C.1) ─────────────────────────────────────────────
//
// Two-step SMS OTP flow that funnels a Flipsies staff member from the
// storefront into the DeliverDesk admin panel. Uses the existing backend
// endpoints (/auth/request-otp, /auth/verify-otp) — no new server code.
//
// On successful verification, this page base64-encodes the returned
// { token, user } blob and redirects to
//   https://www.deliverdesk.app/#handoff=<base64>
//
// DeliverDesk's src/app.js boot handler reads the hash, writes both values
// into localStorage under the usual keys, scrubs the hash (so the token is
// never visible in the address bar or history after the first load), and
// the existing session restore code kicks in — the staff member lands on
// their normal admin panel as if they'd logged in at deliverdesk.app
// directly.
//
// The JWT rides in the URL FRAGMENT (not a query param) on purpose: URL
// fragments are never sent to web servers, so the token never hits any
// backend log or referer header. It only lives in the browser until the
// next boot scrubs it.

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

// Pin the DeliverDesk origin as a constant so the DNS cutover is a
// one-line change when www.deliverdesk.app moves or gets aliased.
const DELIVERDESK_ORIGIN = 'https://www.deliverdesk.app';

// The storefront hits the same backend URL the rest of the site does.
// Reads from the public env var with a safe default so local dev points
// at production automatically.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://deliverdesk-backend-production.up.railway.app';

type Step = 'phone' | 'code' | 'handoff';

export default function StaffLoginPage() {
  const [step,       setStep]       = useState<Step>('phone');
  const [phone,      setPhone]      = useState('');
  const [code,       setCode]       = useState('');
  const [name,       setName]       = useState<string | null>(null); // server echoes back at /request-otp
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Step 1 — request an OTP for this phone
  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          setError("We couldn't find a staff account with that phone number.");
        } else if (res.status === 403) {
          setError('This account is inactive. Contact an admin.');
        } else if (res.status === 429) {
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else {
          setError(body?.error || 'Could not send code. Please try again.');
        }
        return;
      }
      setName(body?.name || null);
      setStep('code');
    } catch (err) {
      console.error('[staff-login] request-otp failed:', err);
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — verify the code, receive { token, user }, hand off to DeliverDesk
  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setError('Enter the 6-digit code from your text message.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), code: clean }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setError('That code is incorrect or expired. Request a new one.');
        } else if (res.status === 429) {
          setError('Too many verification attempts. Please wait and try again.');
        } else {
          setError(body?.error || 'Could not verify code. Please try again.');
        }
        return;
      }
      if (!body?.token || !body?.user) {
        setError('Unexpected response from the server. Please try again.');
        return;
      }
      // Build the handoff payload and navigate. The base64 blob contains
      // both the JWT and the user record so DeliverDesk can restore a
      // full session without a second roundtrip.
      const payload = JSON.stringify({ token: body.token, user: body.user });
      const handoff = encodeURIComponent(btoa(payload));
      setStep('handoff');
      // Small deliberate delay so the user sees the "signing you in…"
      // state briefly — avoids a disorienting flash.
      setTimeout(() => {
        window.location.href = `${DELIVERDESK_ORIGIN}/#handoff=${handoff}`;
      }, 400);
    } catch (err) {
      console.error('[staff-login] verify-otp failed:', err);
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-brand-warm-gray min-h-[calc(100vh-4rem)]">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-6">
          <Link href="/" className="hover:text-brand-charcoal transition-colors">Home</Link>
          <span>/</span>
          <span className="text-brand-charcoal font-medium">Staff Sign In</span>
        </nav>

        <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-charcoal">
              Staff Sign In
            </h1>
            <p className="text-sm text-brand-charcoal-light mt-2">
              Sign in to DeliverDesk with your phone number. We&apos;ll send a 6-digit code via text message.
            </p>
          </div>

          {step === 'phone' && (
            <form onSubmit={requestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(205) 555-0100"
                  className="w-full border border-brand-border rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-brand w-full py-3 text-base disabled:opacity-50"
              >
                {loading ? 'Sending code…' : 'Send Code'}
              </button>

              <p className="text-xs text-brand-charcoal-light text-center pt-3">
                Not a staff member?{' '}
                <Link href="/" className="underline hover:text-brand-charcoal">
                  Back to the storefront
                </Link>
              </p>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="bg-brand-warm-gray rounded-lg px-4 py-3 text-sm text-brand-charcoal-light">
                {name ? <>A code was sent to <strong className="text-brand-charcoal">{name}</strong> at {phone}.</> : <>A code was sent to {phone}.</>}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">
                  6-digit code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full border border-brand-border rounded-lg px-4 py-3 text-xl tracking-[0.3em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-brand w-full py-3 text-base disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setError(null); }}
                className="w-full text-xs text-brand-charcoal-light hover:text-brand-charcoal underline"
              >
                ← Use a different phone number
              </button>
            </form>
          )}

          {step === 'handoff' && (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green-light flex items-center justify-center text-brand-green mb-4 animate-pulse">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm text-brand-charcoal-light">
                Signing you into DeliverDesk…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
