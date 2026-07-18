'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Mechanism } from '@/lib/api';

// Southern Motion sells one seat in several reclining MECHANISMS (rocker,
// wall-hugger, power headrest, swivel, hi-leg…). This is the "how would you like
// it to move?" menu: every mechanism the model comes in, priced, with a plain
// description of what it does. In-stock mechanisms link to their live PDP (same
// route-don't-swap rationale as ColorSelector — keeps price, gallery, JSON-LD
// consistent); made-to-order ones show priced-from with their description.
//
// It reads a mechanism catalog, not reachable product rows — the made-to-order
// frames are unpublished — mirroring how FabricSelector offers the full fabric
// library rather than one row per fabric.
export default function MechanismSelector({
  mechanisms,
  currentId,
}: {
  mechanisms: Mechanism[];
  currentId: string;
}) {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Warm the in-stock destinations so switching is instant.
  useEffect(() => {
    for (const m of mechanisms) {
      if (m.route_id && m.route_id !== currentId) router.prefetch(`/product/${m.route_id}`);
    }
  }, [mechanisms, currentId, router]);

  if (!mechanisms || mechanisms.length < 2) return null;

  const current = mechanisms.find((m) => m.is_current) ?? null;
  const basePrice = current?.from_price ?? Math.min(...mechanisms.map((m) => m.from_price ?? Infinity));

  // Price cell: the current frame reads "Your selection"; others read the
  // difference ("+$200") when we know the base, else their own from-price.
  function priceLabel(m: Mechanism): string {
    if (m.is_current) return 'Your selection';
    if (m.from_price == null) return 'Ask us';
    if (basePrice != null && Number.isFinite(basePrice)) {
      const d = Math.round((m.from_price - basePrice) * 100) / 100;
      if (d > 0) return `+$${d.toFixed(2)}`;
      if (d < 0) return `-$${Math.abs(d).toFixed(2)}`;
      return 'Same price';
    }
    return `from $${m.from_price.toFixed(2)}`;
  }

  return (
    <div className="mt-5">
      <label className="block text-sm font-semibold text-brand-charcoal mb-1">
        How would you like it to move?
      </label>
      <p className="text-xs text-brand-charcoal-light mb-3">
        This model is built in several reclining mechanisms — choose the motion that fits you.
      </p>

      <ul className="flex flex-col gap-2">
        {mechanisms.map((m) => {
          const active = m.is_current;
          const routable = !!m.route_id && !active;
          const open = openKey === m.key;

          const inner = (
            <div
              className={`flex items-start gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${
                active
                  ? 'border-brand-yellow bg-brand-yellow/5'
                  : 'border-brand-border hover:border-brand-charcoal-light'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm ${active ? 'font-semibold text-brand-charcoal' : 'font-medium text-brand-charcoal'}`}>
                    {m.label}
                  </span>
                  {m.in_stock ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-green">In stock</span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-charcoal-light">Made to order</span>
                  )}
                </div>
                {m.description && (
                  <p className={`mt-1 text-xs text-brand-charcoal-light ${open ? '' : 'line-clamp-2'}`}>
                    {m.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-sm font-semibold ${active ? 'text-brand-charcoal' : 'text-brand-charcoal'}`}>
                  {priceLabel(m)}
                </div>
                {routable && <div className="text-[11px] text-brand-yellow-dark mt-0.5">View →</div>}
              </div>
            </div>
          );

          // In-stock, non-current → link to its live PDP. Otherwise a button that
          // toggles the full description (made-to-order + the current frame).
          return (
            <li key={m.id}>
              {routable ? (
                <Link href={`/product/${m.route_id}`} aria-label={`${m.label} — ${priceLabel(m)}`} className="block">
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : m.key)}
                  aria-expanded={open}
                  className="block w-full text-left"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
