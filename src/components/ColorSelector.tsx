'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProductVariant } from '@/lib/api';

// Variant selector for products with sibling variants (same variant_group_id).
// One component, two axes (`axis` prop, from the backend's variant_axis):
//   - 'color' (Jofran/Fusion colorways): swatch row + dropdown, both captioned
//     by colour, each routing to that colorway's page.
//   - 'size'  (MLily mattress sizes): a size dropdown showing each size and its
//     size-appropriate price. No swatch row — every mattress size shares the
//     same photo, so a row of identical chips is noise; the dropdown is the
//     right affordance (Jett 2026-07-17).
//
// Why route instead of swapping price/gallery in client state: this page's
// price also feeds generateMetadata + the Product JSON-LD offer. Mutating the
// displayed price without changing the URL would leave the structured data
// advertising the old price — a merchant-feed mismatch. Routing keeps price,
// gallery, availability, canonical URL and JSON-LD consistent.
//
// The navigation still feels instant: every sibling is prefetched (Links
// prefetch automatically in prod; the effect warms the dropdown-only ones
// too), so the click is a client-side transition with no page reload.
export default function ColorSelector({
  variants,
  currentId,
  axis = 'color',
}: {
  variants: ProductVariant[];
  currentId: string;
  axis?: 'color' | 'size';
}) {
  const router = useRouter();

  // Warm every sibling so switching is instant regardless of which affordance is
  // used. Variant counts are small (a handful per group).
  useEffect(() => {
    for (const v of variants) {
      if (v.id !== currentId) router.prefetch(`/product/${v.id}`);
    }
  }, [variants, currentId, router]);

  if (!variants || variants.length < 2) return null;

  const isSize = axis === 'size';
  const heading = isSize ? 'Size' : 'Color';
  const selectId = isSize ? 'size-select' : 'color-select';
  const value = variants.some((v) => v.id === currentId) ? currentId : variants[0].id;
  const name = (v: ProductVariant) => (isSize ? v.size ?? 'One size' : v.color ?? 'Standard');
  // Stock suffix is meaningful for colorways (some stocked, some special-order);
  // mattress sizes are all direct-ship, so a suffix on every option is just noise.
  const label = (v: ProductVariant) =>
    isSize ? name(v) : name(v) + (v.in_stock ? ' (in stock)' : ' (needs to be ordered)');

  return (
    <div className="mt-5">
      <label htmlFor={selectId} className="block text-sm font-semibold text-brand-charcoal mb-2">
        {heading}
      </label>

      {/* Swatches (colorways only) — click straight through to a colorway. Each is
          captioned: our swatches are product photos, not fabric close-ups, and
          many are shot on white (a cream sofa on a white sweep is an unreadable
          56px chip). The caption carries the identity so the image doesn't have
          to. Size groups skip this entirely (identical photos). */}
      {!isSize && (
        <ul className="flex flex-wrap gap-2 mb-3">
          {variants.map((v) => {
            const active = v.id === value;
            return (
              <li key={v.id} className="w-16">
                <Link
                  href={`/product/${v.id}`}
                  aria-label={label(v)}
                  aria-current={active ? 'true' : undefined}
                  title={label(v)}
                  className="group block"
                >
                  <span
                    className={`relative block w-16 h-16 rounded-lg overflow-hidden border-2 bg-brand-warm-gray transition-colors ${
                      active
                        ? 'border-brand-yellow ring-2 ring-brand-yellow/30'
                        : 'border-brand-border group-hover:border-brand-charcoal-light'
                    }`}
                  >
                    {v.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-base opacity-30">🛋</span>
                    )}
                    {/* Out-of-stock colorways stay selectable (special order) but read as muted. */}
                    {!v.in_stock && <span className="absolute inset-0 bg-white/55" aria-hidden />}
                  </span>
                  <span
                    className={`block mt-1 text-[10px] leading-tight text-center break-words ${
                      active ? 'text-brand-charcoal font-semibold' : 'text-brand-charcoal-light'
                    }`}
                  >
                    {name(v)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <select
        id={selectId}
        value={value}
        onChange={(e) => {
          if (e.target.value !== currentId) router.push(`/product/${e.target.value}`);
        }}
        className="w-full sm:w-72 rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-charcoal focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow"
      >
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {label(v)}
            {typeof v.retail_price === 'number' ? ` — $${Number(v.retail_price).toFixed(2)}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
