'use client';

// ── Customer account home (Phase 0) ───────────────────────────────────────────
//
// Minimal authed landing that proves the portal session end-to-end. If there's
// no session we bounce to /account/login. Phase 1 replaces the placeholder body
// with unified order history (online + in-store) off an authed /portal/orders
// endpoint.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCustomer,
  isSignedIn,
  clearCustomerSession,
  type CustomerProfile,
} from '@/lib/customerSession';

export default function AccountHomePage() {
  const router = useRouter();
  // Session lives in localStorage, so read it after mount to stay SSR-safe and
  // avoid a hydration mismatch. `ready` gates the first paint until we know.
  const [ready,    setReady]    = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/account/login');
      return;
    }
    setCustomer(getCustomer());
    setReady(true);
  }, [router]);

  function signOut() {
    clearCustomerSession();
    router.replace('/account/login');
  }

  if (!ready) {
    return (
      <div className="bg-brand-warm-gray min-h-[calc(100vh-4rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-sm text-brand-charcoal-light">
          Loading…
        </div>
      </div>
    );
  }

  const name = customer?.first_name || 'there';

  return (
    <div className="bg-brand-warm-gray min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-brand-charcoal">Welcome back, {name}</h1>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-brand-charcoal-light hover:text-brand-charcoal underline"
          >
            Sign out
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm space-y-3">
          <p className="text-sm text-brand-charcoal">
            You&apos;re signed in{customer?.phone ? <> as <strong>{customer.phone}</strong></> : null}.
          </p>
          <p className="text-sm text-brand-charcoal-light">
            Your orders, delivery updates, and saved items will appear here soon.
          </p>
          <p className="pt-2">
            <Link href="/" className="text-sm underline hover:text-brand-charcoal">
              ← Back to the storefront
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
