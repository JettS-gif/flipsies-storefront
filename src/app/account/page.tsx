'use client';

// ── Customer account home (Phase 1) ───────────────────────────────────────────
//
// Authed landing + unified order history (online + in-store). Reads the session
// from localStorage after mount (SSR-safe), then loads /portal/orders. A 401
// means the token expired → sign out. Phase 2 adds per-order delivery/custom-
// order status detail.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCustomer,
  isSignedIn,
  clearCustomerSession,
  portalGetOrders,
  type CustomerProfile,
  type OrderCard,
} from '@/lib/customerSession';
import { statusLabel, money, orderDate } from '@/lib/orderLabels';

export default function AccountHomePage() {
  const router = useRouter();
  const [ready,    setReady]    = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders,   setOrders]   = useState<OrderCard[] | null>(null); // null = still loading
  const [loadErr,  setLoadErr]  = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/account/login');
      return;
    }
    setCustomer(getCustomer());
    setReady(true);

    let cancelled = false;
    (async () => {
      const r = await portalGetOrders();
      if (cancelled) return;
      if (r.unauthorized) {
        // Token expired/invalid — drop the session and re-auth.
        clearCustomerSession();
        router.replace('/account/login');
        return;
      }
      if (!r.ok) { setLoadErr(true); setOrders([]); return; }
      setOrders(r.orders);
    })();
    return () => { cancelled = true; };
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

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wide">
            Your orders
          </h2>
          <Link href="/account/wishlist" className="text-sm text-brand-charcoal-light hover:text-brand-charcoal underline">
            Saved items →
          </Link>
        </div>

        {/* Loading */}
        {orders === null && (
          <div className="bg-white rounded-2xl border border-brand-border p-6 text-sm text-brand-charcoal-light shadow-sm">
            Loading your orders…
          </div>
        )}

        {/* Error */}
        {orders !== null && loadErr && (
          <div className="bg-white rounded-2xl border border-brand-border p-6 text-sm text-red-700 shadow-sm">
            We couldn&apos;t load your orders right now. Please refresh in a moment.
          </div>
        )}

        {/* Empty */}
        {orders !== null && !loadErr && orders.length === 0 && (
          <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 text-center shadow-sm">
            <p className="text-sm text-brand-charcoal">You don&apos;t have any orders yet.</p>
            <p className="pt-3">
              <Link href="/" className="text-sm underline hover:text-brand-charcoal">Start shopping →</Link>
            </p>
          </div>
        )}

        {/* Order list */}
        {orders !== null && orders.length > 0 && (
          <ul className="space-y-3">
            {orders.map(o => (
              <li key={o.invoice_number}>
                <Link
                  href={`/account/orders/${encodeURIComponent(o.invoice_number)}`}
                  className="block bg-white rounded-2xl border border-brand-border p-4 sm:p-5 shadow-sm hover:border-brand-charcoal-light transition-colors"
                >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-brand-charcoal">{o.invoice_number}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-warm-gray text-brand-charcoal-light">
                        {o.channel === 'online' ? 'Online' : 'In-store'}
                      </span>
                      {o.type === 'custom_order' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Custom order
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-charcoal-light mt-1">{orderDate(o.date)}</p>
                    {o.items_preview.length > 0 && (
                      <p className="text-sm text-brand-charcoal mt-2 truncate">
                        {o.items_preview.join(', ')}
                        {o.item_count > o.items_preview.length ? ` + ${o.item_count - o.items_preview.length} more` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-brand-charcoal">{money(o.total)}</div>
                    <div className="text-xs text-brand-charcoal-light mt-0.5">{statusLabel(o.status)}</div>
                    {o.balance_due > 0 && (
                      <div className="text-xs text-red-700 mt-0.5">{money(o.balance_due)} due</div>
                    )}
                  </div>
                </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="pt-6">
          <Link href="/" className="text-sm underline hover:text-brand-charcoal">
            ← Back to the storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
