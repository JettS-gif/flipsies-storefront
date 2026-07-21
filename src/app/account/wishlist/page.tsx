'use client';

// ── Customer wishlist (Phase 3) ───────────────────────────────────────────────
//
// Saved products for the signed-in customer. Each row links to the product,
// can be removed, and (when still orderable) added straight to the cart via the
// existing CartContext. 401 → sign out. SSR-safe: session read after mount.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { thumb } from '@/lib/img';
import { money } from '@/lib/orderLabels';
import {
  isSignedIn,
  clearCustomerSession,
  portalGetWishlist,
  portalRemoveWishlist,
  type WishlistItem,
} from '@/lib/customerSession';

function displayName(it: WishlistItem): string {
  return [it.collection, it.color].filter(Boolean).join(' — ') || it.name;
}

export default function WishlistPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [items,   setItems]   = useState<WishlistItem[] | null>(null); // null = loading
  const [loadErr, setLoadErr] = useState(false);
  const [added,   setAdded]   = useState<Record<string, boolean>>({}); // product_id → "Added!" flash

  useEffect(() => {
    if (!isSignedIn()) { router.replace('/account/login'); return; }
    let cancelled = false;
    (async () => {
      const r = await portalGetWishlist();
      if (cancelled) return;
      if (r.unauthorized) { clearCustomerSession(); router.replace('/account/login'); return; }
      if (!r.ok) { setLoadErr(true); setItems([]); return; }
      setItems(r.items);
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function remove(productId: string) {
    // Optimistic — drop it from the list immediately.
    setItems(prev => (prev ? prev.filter(i => i.product_id !== productId) : prev));
    const r = await portalRemoveWishlist(productId);
    if (r.unauthorized) { clearCustomerSession(); router.replace('/account/login'); }
  }

  function addToCart(it: WishlistItem) {
    addItem({
      product_id: it.product_id,
      sku:        it.sku || it.product_id,
      name:       displayName(it),
      price:      it.price,
      image_url:  it.image_url,
      category:   it.category,
    });
    setAdded(a => ({ ...a, [it.product_id]: true }));
    setTimeout(() => setAdded(a => ({ ...a, [it.product_id]: false })), 1500);
  }

  return (
    <div className="bg-brand-warm-gray min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/account" className="text-sm text-brand-charcoal-light hover:text-brand-charcoal underline">
          ← Account
        </Link>
        <h1 className="text-2xl font-bold text-brand-charcoal mt-4 mb-6">Saved items</h1>

        {items === null && (
          <div className="text-sm text-brand-charcoal-light">Loading…</div>
        )}

        {items !== null && loadErr && (
          <div className="bg-white rounded-2xl border border-brand-border p-6 text-sm text-red-700 shadow-sm">
            We couldn&apos;t load your saved items right now. Please refresh in a moment.
          </div>
        )}

        {items !== null && !loadErr && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 text-center shadow-sm">
            <p className="text-sm text-brand-charcoal">You haven&apos;t saved any items yet.</p>
            <p className="pt-3">
              <Link href="/" className="text-sm underline hover:text-brand-charcoal">Browse the catalog →</Link>
            </p>
          </div>
        )}

        {items !== null && items.length > 0 && (
          <ul className="space-y-3">
            {items.map(it => (
              <li
                key={it.product_id}
                className="bg-white rounded-2xl border border-brand-border p-4 shadow-sm flex gap-4"
              >
                <Link href={`/product/${it.product_id}`} className="shrink-0">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb(it.image_url, { width: 160 })}
                      alt={displayName(it)}
                      className="w-20 h-20 object-cover rounded-lg bg-brand-warm-gray"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-brand-warm-gray" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${it.product_id}`}
                    className="text-sm font-medium text-brand-charcoal hover:underline block truncate"
                  >
                    {displayName(it)}
                  </Link>
                  <p className="text-sm text-brand-charcoal mt-0.5">{money(it.price)}</p>
                  <p className="text-xs mt-0.5">
                    {!it.available ? (
                      <span className="text-brand-charcoal-light">No longer available</span>
                    ) : it.in_stock ? (
                      <span className="text-brand-green font-medium">In stock</span>
                    ) : (
                      <span className="text-brand-yellow-dark font-medium">Special order</span>
                    )}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    {it.available && (
                      <button
                        type="button"
                        onClick={() => addToCart(it)}
                        className="text-sm btn-brand px-4 py-1.5"
                      >
                        {added[it.product_id] ? 'Added!' : 'Add to cart'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(it.product_id)}
                      className="text-xs text-brand-charcoal-light hover:text-red-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
