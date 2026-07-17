'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Fabric } from '@/lib/api';

// Fabric selector for fabric-graded frames (Chairs America). Unlike the Fusion
// ColorSelector — which routes to a sibling PRODUCT per colorway — a fabric here
// is NOT a product row. The frame is made to order in any library fabric, priced
// off the frame's grade→price map, and the SKU is minted at checkout. So this
// swaps price in CLIENT state (no per-fabric URL to route to) and adds a
// frame+fabric line to the cart.
//
// Selecting a swatch expands it in place (large preview) and updates the price —
// the shopper sees the fabric and its grade price before adding to cart.
export default function FabricSelector({
  frame,
  fabrics,
  fromPrice,
}: {
  frame: { id: string; sku: string; name: string; collection: string | null; category: string | null; image_url?: string | null };
  fabrics: Fabric[];
  fromPrice: number;
}) {
  const { addItem } = useCart();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  // Group by grade (1..6, then ungraded last); in-stock first within a grade.
  const byGrade = useMemo(() => {
    const groups = new Map<string, Fabric[]>();
    for (const f of fabrics) {
      const g = f.grade ?? '—';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(f);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => Number(b.in_stock) - Number(a.in_stock) || a.name.localeCompare(b.name));
    }
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === '—') return 1;
      if (b[0] === '—') return -1;
      return Number(a[0]) - Number(b[0]);
    });
  }, [fabrics]);

  const selected = fabrics.find((f) => f.id === selectedId) ?? null;
  const price = selected?.price ?? fromPrice;

  function handleAdd() {
    if (!selected) return;
    addItem({
      product_id: frame.id,
      fabric_id: selected.id,
      fabric_name: selected.name,
      sku: `${frame.sku}::${selected.name}`,
      name: `${frame.collection ?? frame.name} — ${selected.name}`,
      price,
      image_url: selected.swatch_image_url ?? frame.image_url ?? null,
      category: frame.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (!fabrics.length) return null;

  return (
    <div className="mt-8 border-t border-brand-border pt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider">
          Order in your fabric
        </h2>
        <span className="text-xs text-brand-charcoal-light">{fabrics.length} fabrics</span>
      </div>
      <p className="mt-1 text-sm text-brand-charcoal-light">
        Made to order in any fabric below — pick one to see it enlarged and priced.
      </p>

      {/* Selected preview + reactive price — the swatch expands in place here. */}
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-brand-border bg-brand-warm-gray/50 p-4">
        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-brand-border bg-brand-warm-gray">
          {selected?.swatch_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.swatch_image_url} alt={selected.name} className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-2xl opacity-30">🧵</span>
          )}
        </div>
        <div className="min-w-0">
          {selected ? (
            <>
              <div className="text-sm font-semibold text-brand-charcoal truncate">
                {selected.name}{selected.grade ? ` · Grade ${selected.grade}` : ''}
                {selected.in_stock && <span className="ml-2 text-xs text-brand-green font-medium">In stock</span>}
              </div>
              <div className="text-2xl font-bold text-brand-charcoal mt-0.5">${price.toFixed(2)}</div>
              <button
                type="button"
                onClick={handleAdd}
                className="btn-brand text-sm px-6 py-2 mt-2"
              >
                {added ? 'Added!' : 'Add to Cart'}
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-brand-charcoal-light">Select a fabric</div>
              <div className="text-2xl font-bold text-brand-charcoal mt-0.5">from ${fromPrice.toFixed(2)}</div>
            </>
          )}
        </div>
      </div>

      {byGrade.map(([grade, list]) => {
        const gradePrice = list.find((f) => f.price != null)?.price ?? null;
        return (
          <div key={grade} className="mt-5">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xs font-semibold text-brand-charcoal">
                {grade === '—' ? 'Other fabrics' : `Grade ${grade}`}
              </span>
              {gradePrice != null && (
                <span className="text-xs text-brand-charcoal-light">${gradePrice.toFixed(2)}</span>
              )}
            </div>
            <ul className="flex flex-wrap gap-2">
              {list.map((f) => {
                const active = f.id === selectedId;
                return (
                  <li key={f.id} className="w-16">
                    <button
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      aria-pressed={active}
                      title={`${f.name}${f.in_stock ? ' (in stock)' : ''}${f.price != null ? ` — $${f.price.toFixed(2)}` : ''}`}
                      className="group block w-full text-left"
                    >
                      <span
                        className={`relative block w-16 h-16 rounded-lg overflow-hidden border-2 bg-brand-warm-gray transition-all ${
                          active
                            ? 'border-brand-yellow ring-2 ring-brand-yellow/30 scale-105'
                            : 'border-brand-border group-hover:border-brand-charcoal-light'
                        }`}
                      >
                        {f.swatch_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.swatch_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-base opacity-30">🧵</span>
                        )}
                        {f.in_stock && (
                          <span className="absolute bottom-0 inset-x-0 bg-brand-green text-white text-[8px] leading-tight text-center py-0.5">
                            In stock
                          </span>
                        )}
                      </span>
                      <span
                        className={`block mt-1 text-[10px] leading-tight text-center break-words ${
                          active ? 'text-brand-charcoal font-semibold' : 'text-brand-charcoal-light'
                        }`}
                      >
                        {f.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
