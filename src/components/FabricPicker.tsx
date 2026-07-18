'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Fabric } from '@/lib/api';

// Per-COLOUR faceted picker. Where FabricSelector offers fabric LINES (one
// composite tile per line), this flattens every verified colour swatch into one
// filterable grid — material / colour-family / pattern chips over the swatches —
// so a shopper navigates ~200 colours by what they actually want. Backed by
// vendor_fabric_colors (only swatch_verified rows reach here). Falls back to the
// line selector when a product has no verified colours yet.

function gradeLabel(grade: string | null): string {
  switch (grade) {
    case 'Fabric': return 'Fabric';
    case 'Accent': return 'Accent';
    case 'L1':     return 'Leather';
    case 'L2':     return 'Premium Leather';
    default:       return grade ? `G${grade}` : 'Fabric';
  }
}

type Item = {
  id: string; name: string; swatch_image_url: string | null; hex: string | null;
  color_family: string | null; pattern_type: string | null; in_stock: boolean;
  line_id: string; line_name: string; grade: string | null; price: number | null;
};

// Stable display order for the colour-family chips.
const FAMILY_ORDER = ['White', 'Cream/Beige', 'Tan/Taupe', 'Brown', 'Grey', 'Charcoal/Black', 'Blue', 'Green', 'Red/Rust'];

export default function FabricPicker({
  frame,
  fabrics,
  fromPrice,
}: {
  frame: { id: string; sku: string; name: string; collection: string | null; category: string | null; image_url?: string | null };
  fabrics: Fabric[];
  fromPrice: number;
}) {
  const { addItem } = useCart();
  const [material, setMaterial] = useState<string | null>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [pattern, setPattern] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const items = useMemo<Item[]>(
    () => fabrics.flatMap((f) => (f.colors ?? []).map((c) => ({
      id: c.id, name: c.name, swatch_image_url: c.swatch_image_url, hex: c.hex,
      color_family: c.color_family, pattern_type: c.pattern_type, in_stock: c.in_stock,
      line_id: f.id, line_name: f.name, grade: f.grade, price: f.price,
    }))),
    [fabrics],
  );

  // Facet option lists (with counts), computed off the full item set.
  const facets = useMemo(() => {
    const tally = (key: (i: Item) => string | null) => {
      const m = new Map<string, number>();
      for (const it of items) { const v = key(it); if (v) m.set(v, (m.get(v) ?? 0) + 1); }
      return m;
    };
    const mats = tally((i) => gradeLabel(i.grade));
    const fams = tally((i) => i.color_family);
    const pats = tally((i) => i.pattern_type);
    return {
      materials: [...mats.entries()].sort((a, b) => b[1] - a[1]),
      families: [...fams.entries()].sort((a, b) => FAMILY_ORDER.indexOf(a[0]) - FAMILY_ORDER.indexOf(b[0])),
      patterns: [...pats.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [items]);

  const filtered = useMemo(
    () => items
      .filter((i) => (!material || gradeLabel(i.grade) === material) && (!family || i.color_family === family) && (!pattern || i.pattern_type === pattern))
      .sort((a, b) => {
        if (a.in_stock !== b.in_stock) return Number(b.in_stock) - Number(a.in_stock);
        return a.name.localeCompare(b.name);
      }),
    [items, material, family, pattern],
  );

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const price = selected?.price ?? fromPrice;
  const anyFilter = !!(material || family || pattern);

  function handleAdd() {
    if (!selected) return;
    addItem({
      product_id: frame.id,
      fabric_id: selected.id,
      fabric_name: `${selected.line_name} ${selected.name}`,
      sku: `${frame.sku}::${selected.line_name} ${selected.name}`,
      name: `${frame.collection ?? frame.name} — ${selected.line_name} ${selected.name}`,
      price,
      image_url: selected.swatch_image_url ?? frame.image_url ?? null,
      category: frame.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (!items.length) return null;

  const Chip = ({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
        active ? 'bg-brand-charcoal text-white border-brand-charcoal' : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-charcoal-light'
      }`}
    >
      {label} <span className={active ? 'opacity-70' : 'text-brand-charcoal-light'}>{count}</span>
    </button>
  );

  const FilterRow = ({ title, options, value, set }: { title: string; options: [string, number][]; value: string | null; set: (v: string | null) => void }) =>
    options.length > 1 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-charcoal-light w-14 shrink-0">{title}</span>
        {options.map(([opt, n]) => (
          <Chip key={opt} label={opt} count={n} active={value === opt} onClick={() => set(value === opt ? null : opt)} />
        ))}
      </div>
    ) : null;

  return (
    <div className="mt-10 border-t border-brand-border pt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider">Order in your color</h2>
        <span className="text-xs text-brand-charcoal-light">{filtered.length}{anyFilter ? ` of ${items.length}` : ''} colors</span>
      </div>
      <p className="mt-1 text-sm text-brand-charcoal-light">Made to order — filter by material, color, and pattern, then tap a swatch to preview it and see your price.</p>

      {/* Facet filters */}
      <div className="mt-4 flex flex-col gap-2">
        <FilterRow title="Material" options={facets.materials} value={material} set={setMaterial} />
        <FilterRow title="Color" options={facets.families} value={family} set={setFamily} />
        <FilterRow title="Pattern" options={facets.patterns} value={pattern} set={setPattern} />
        {anyFilter && (
          <button type="button" onClick={() => { setMaterial(null); setFamily(null); setPattern(null); }} className="self-start text-xs text-brand-yellow-dark hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Zoom window (float) + swatch grid flowing around it. */}
      <div className="mt-5 overflow-hidden">
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
                {selected.name}
                <span className="font-normal text-brand-charcoal-light"> · {selected.line_name}</span>
                {selected.in_stock && <span className="ml-2 text-xs text-brand-green font-medium">In stock</span>}
              </div>
            ) : (
              <div className="text-sm text-brand-charcoal-light">Select a color</div>
            )}
            <div className="text-[11px] text-brand-charcoal-light">{gradeLabel(selected?.grade ?? null)}</div>
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

        {filtered.map((it) => {
          const active = it.id === selectedId;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setSelectedId(it.id)}
              aria-pressed={active}
              title={`${it.name} · ${it.line_name}${it.in_stock ? ' (in stock)' : ''}${it.price != null ? ` — $${it.price.toFixed(2)}` : ''}`}
              className="inline-block align-top w-16 m-1 text-left group"
            >
              <span
                className={`relative block w-16 h-16 rounded-lg overflow-hidden border-2 bg-brand-warm-gray transition-all ${
                  active ? 'border-brand-yellow ring-2 ring-brand-yellow/30 scale-105' : 'border-brand-border group-hover:border-brand-charcoal-light'
                }`}
              >
                {it.swatch_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.swatch_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-base opacity-30">🧵</span>
                )}
                {it.in_stock && (
                  <span className="absolute bottom-0 inset-x-0 bg-brand-green text-white text-[8px] leading-tight text-center py-0.5">In stock</span>
                )}
              </span>
              <span className={`block mt-1 text-[10px] leading-tight text-center break-words ${active ? 'text-brand-charcoal font-semibold' : 'text-brand-charcoal-light'}`}>
                {it.name}
              </span>
            </button>
          );
        })}
        {!filtered.length && (
          <div className="text-sm text-brand-charcoal-light py-8 text-center">No colors match these filters.</div>
        )}
      </div>

      {zoomed && selected?.swatch_image_url && (
        <div role="dialog" aria-modal="true" onClick={() => setZoomed(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out">
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.swatch_image_url} alt={selected.name} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
            <div className="mt-3 text-center text-white">
              <span className="font-semibold">{selected.name}</span>
              <span className="opacity-80"> · {selected.line_name} · {gradeLabel(selected.grade)}</span>
              <span className="ml-2 font-bold">${price.toFixed(2)}</span>
            </div>
            <button type="button" onClick={() => setZoomed(false)} aria-label="Close" className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-brand-charcoal text-lg font-bold shadow flex items-center justify-center">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
