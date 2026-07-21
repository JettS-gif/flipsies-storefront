'use client';

// ── Customer portal login (Phase 0) ───────────────────────────────────────────
//
// Two-step phone + OTP sign-in for END CUSTOMERS. Twin of staff-login/page.tsx,
// but hits /portal/* (not /auth/*), resolves against the customers table, and
// keeps the customer here in the storefront (no DeliverDesk handoff). On success
// we store the aud:'customer' session and land on /account.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import {
  portalRequestOtp,
  portalVerifyOtp,
  saveCustomerSession,
} from '@/lib/customerSession';

type Step = 'phone' | 'code';

export default function AccountLoginPage() {
  const router = useRouter();
  const { syncCartFromAccount } = useCart();
  const [step,    setStep]    = useState<Step>('phone');
  const [phone,   setPhone]   = useState('');
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null); // DEV_MODE code echo

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDevHint(null);

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const r = await portalRequestOtp(digits);
      if (!r.ok) {
        setError(
          r.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : 'Could not send code. Please try again.'
        );
        return;
      }
      // DEV_MODE: backend echoes the code so we can prefill it for wire-tests.
      if (r.devCode) {
        setCode(r.devCode);
        setDevHint(`Dev mode: code ${r.devCode} prefilled.`);
      }
      setStep('code');
    } catch (err) {
      console.error('[account-login] request-otp failed:', err);
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

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
      const r = await portalVerifyOtp(phone, clean);
      if (!r.ok) {
        setError(
          r.status === 429
            ? 'Too many verification attempts. Please wait and try again.'
            : 'That code is incorrect or expired. Request a new one.'
        );
        return;
      }
      if (!r.token || !r.customer) {
        setError('Unexpected response from the server. Please try again.');
        return;
      }
      saveCustomerSession(r.token, r.customer);
      // Merge this device's cart with the customer's saved cart before leaving
      // the page, so the union is persisted at the login moment.
      await syncCartFromAccount();
      router.push('/account');
    } catch (err) {
      console.error('[account-login] verify-otp failed:', err);
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
          <span className="text-brand-charcoal font-medium">My Account</span>
        </nav>

        <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-charcoal">Sign in to your account</h1>
            <p className="text-sm text-brand-charcoal-light mt-2">
              Enter your phone number and we&apos;ll text you a 6-digit code. See your orders,
              delivery updates, and saved items.
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
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="bg-brand-warm-gray rounded-lg px-4 py-3 text-sm text-brand-charcoal-light">
                A code was sent to {phone}.
              </div>

              {devHint && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  {devHint}
                </div>
              )}

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
                onClick={() => { setStep('phone'); setCode(''); setError(null); setDevHint(null); }}
                className="w-full text-xs text-brand-charcoal-light hover:text-brand-charcoal underline"
              >
                ← Use a different phone number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
