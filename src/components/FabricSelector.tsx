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
// Layout mirrors the Fusion swatch UX: a grid of swatches, current one ringed,
// captioned with the name (our swatches are small and some frames' fabrics ship
// without a close-up image). Grouped by grade because price is per-grade.
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
        Made to order in any fabric below — price shown updates with the grade you choose.
      </p>

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
                        className={`relative block w-16 h-16 rounded-lg overflow-hidden border-2 bg-brand-warm-gray transition-colors ${
                          active
                            ? 'border-brand-yellow ring-2 ring-brand-yellow/30'
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

      {/* Selection summary + add to cart */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm">
          {selected ? (
            <>
              <span className="text-brand-charcoal-light">Selected: </span>
              <span className="font-semibold text-brand-charcoal">
                {selected.name}{selected.grade ? ` · Grade ${selected.grade}` : ''}
              </span>
              <span className="ml-2 text-lg font-bold text-brand-charcoal">${price.toFixed(2)}</span>
            </>
          ) : (
            <span className="text-brand-charcoal-light">
              Select a fabric to see its price — from <span className="font-semibold text-brand-charcoal">${fromPrice.toFixed(2)}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selected}
          className="btn-brand text-base px-8 py-3 min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {added ? 'Added!' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
