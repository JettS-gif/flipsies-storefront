'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Fabric } from '@/lib/api';

// Fabric selector for fabric-graded frames (Chairs America). A fabric is NOT a
// product row — the frame is made to order in any library fabric, priced off the
// frame's grade→price map, SKU minted at checkout. So this swaps price in CLIENT
// state and adds a frame+fabric line to the cart.
//
// Layout: a large zoom window floats left (under the product gallery); the swatch
// grid flows around it — to its right and wrapping underneath to fill the space.
// Clicking a swatch expands it in the window and reprices live; clicking the
// window opens a full-screen lightbox.
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
  const [zoomed, setZoomed] = useState(false);

  // Flat grid, sorted in-stock first, then grade, then name — so the shopper
  // sees what we have first, and it flows cleanly around the floated window.
  const sorted = useMemo(
    () =>
      [...fabrics].sort((a, b) => {
        if (a.in_stock !== b.in_stock) return Number(b.in_stock) - Number(a.in_stock);
        const ga = a.grade ?? '9', gb = b.grade ?? '9';
        if (ga !== gb) return ga.localeCompare(gb);
        return a.name.localeCompare(b.name);
      }),
    [fabrics],
  );

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
    <div className="mt-10 border-t border-brand-border pt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider">
          Order in your fabric
        </h2>
        <span className="text-xs text-brand-charcoal-light">{fabrics.length} fabrics</span>
      </div>
      <p className="mt-1 text-sm text-brand-charcoal-light">
        Made to order in any fabric — tap a swatch to preview it enlarged and see its price.
      </p>

      {/* overflow-hidden contains the float. */}
      <div className="mt-5 overflow-hidden">
        {/* Zoom window — floats left, under the gallery. */}
        <div className="float-left w-56 sm:w-64 mr-5 mb-4 rounded-xl border border-brand-border overflow-hidden bg-brand-warm-gray/50">
          <button
            type="button"
            onClick={() => selected?.swatch_image_url && setZoomed(true)}
            className={`relative block w-full aspect-square bg-brand-warm-gray ${selected?.swatch_image_url ? 'cursor-zoom-in' : 'cursor-default'}`}
            aria-label={selected?.swatch_image_url ? `Enlarge ${selected.name}` : undefined}
          >
            {selected?.swatch_image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.swatch_image_url} alt={selected.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-full">Tap to enlarge ⤢</span>
              </>
            ) : (
              <span className="flex flex-col items-center justify-center w-full h-full text-brand-charcoal-light p-4 text-center">
                <span className="text-4xl opacity-30">🧵</span>
                <span className="mt-2 text-sm">Tap a swatch to preview</span>
              </span>
            )}
          </button>
          <div className="p-3">
            {selected ? (
              <div className="text-sm font-semibold text-brand-charcoal">
                {selected.name}{selected.grade ? ` · Grade ${selected.grade}` : ''}
                {selected.in_stock && <span className="ml-2 text-xs text-brand-green font-medium">In stock</span>}
              </div>
            ) : (
              <div className="text-sm text-brand-charcoal-light">Select a fabric</div>
            )}
            <div className="text-2xl font-bold text-brand-charcoal mt-0.5">
              {selected ? `$${price.toFixed(2)}` : `from $${fromPrice.toFixed(2)}`}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selected}
              className="btn-brand text-sm px-6 py-2.5 mt-2 w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Swatches — inline-block flow around the floated window. */}
        {sorted.map((f) => {
          const active = f.id === selectedId;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedId(f.id)}
              aria-pressed={active}
              title={`${f.name}${f.grade ? ` · Grade ${f.grade}` : ''}${f.in_stock ? ' (in stock)' : ''}${f.price != null ? ` — $${f.price.toFixed(2)}` : ''}`}
              className="inline-block align-top w-16 m-1 text-left group"
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
                {f.grade && (
                  <span className="absolute top-0 left-0 bg-black/55 text-white text-[8px] px-1 rounded-br">G{f.grade}</span>
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
          );
        })}
      </div>

      {/* Full-screen lightbox for the selected swatch. */}
      {zoomed && selected?.swatch_image_url && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.swatch_image_url} alt={selected.name} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
            <div className="mt-3 text-center text-white">
              <span className="font-semibold">{selected.name}</span>
              {selected.grade ? <span className="opacity-80"> · Grade {selected.grade}</span> : null}
              <span className="ml-2 font-bold">${price.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="Close"
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-brand-charcoal text-lg font-bold shadow flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
