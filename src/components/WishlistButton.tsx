'use client';

// ── WishlistButton (Phase 3) ──────────────────────────────────────────────────
//
// Heart toggle to save a product to the signed-in customer's wishlist. On mount
// (when signed in) it checks whether this product is already saved so the heart
// reflects reality. Not signed in → clicking routes to /account/login. Only the
// product id is needed — the wishlist stores product_id and the account page
// re-fetches display data from the backend.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  isSignedIn,
  portalGetWishlist,
  portalAddWishlist,
  portalRemoveWishlist,
} from '@/lib/customerSession';

export default function WishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (!isSignedIn()) return;
    let cancelled = false;
    (async () => {
      const r = await portalGetWishlist();
      if (!cancelled && r.ok) setSaved(r.items.some(i => i.product_id === productId));
    })();
    return () => { cancelled = true; };
  }, [productId]);

  async function toggle() {
    if (!isSignedIn()) { router.push('/account/login'); return; }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next); // optimistic
    const r = next ? await portalAddWishlist(productId) : await portalRemoveWishlist(productId);
    if (r.unauthorized) { router.push('/account/login'); return; }
    if (!r.ok) setSaved(!next); // revert on failure
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from your saved items' : 'Save to your account'}
      className="inline-flex items-center justify-center gap-2 border border-brand-border rounded-lg px-6 py-3 text-base text-brand-charcoal hover:border-brand-charcoal-light transition-colors disabled:opacity-50"
    >
      <svg
        width="18" height="18" viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={saved ? 'text-red-600' : ''}
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
