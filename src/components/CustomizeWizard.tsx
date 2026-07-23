'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product, Mechanism, Fabric } from '@/lib/api';

// Guided customization flow. Two shapes, chosen off the product payload:
//   • Southern Motion — sold by reclining mechanism: landing → mechanism → fabric
//     → cart. Price = the chosen mechanism's grade→price map at the fabric grade.
//     Fabric step is the per-COLOUR faceted grid (swatch_verified colours), with
//     the real floor photo surfaced in review when we've shot that frame+colour.
//   • Chairs America — fabric-only (no mechanism): landing → fabric → cart. The
//     fabric step is the fabric LINE grid (each line carries its own swatch +
//     grade); price = the frame's grade→price map at the line grade (fabrics[]
//     .price, already computed server-side). Skips the mechanism step entirely.
//
// Landing offers "Shop In Stock" (green, primary) or "Customize" (yellow).

type Step = 'landing' | 'mechanism' | 'fabric' | 'review';

const GRADE_LABEL: Record<string, string> = {
  Fabric: 'Fabric', Accent: 'Accent', L1: 'Leather', L2: 'Premium Leather',
};
const FAMILY_ORDER = ['White', 'Cream/Beige', 'Tan/Taupe', 'Brown', 'Grey', 'Charcoal/Black', 'Blue', 'Green', 'Red/Rust'];

// One selectable colour, carrying its line's grade/price for the pairing price.
type ColorItem = {
  id: string; name: string; swatch_image_url: string | null; product_image_url: string | null;
  color_family: string | null; pattern_type: string | null; in_stock: boolean;
  line_name: string; grade: string | null; price: number | null;
};

function gradeMaterial(grade: string | null): string {
  return GRADE_LABEL[grade ?? ''] ?? 'Fabric';
}

// `pick` is the chosen fabric — a per-colour item (SoMo) or a fabric line (CA);
// both carry a grade + line price. With a mechanism, price off its grade→price
// map; without one (Chairs America), the fabric line's own grade price is the
// price.
function priceFor(mech: Mechanism | null, pick: { grade: string | null; price: number | null } | null, fallback: number): number {
  if (mech) {
    const byGrade = mech.grade_prices?.[pick?.grade ?? 'Fabric'];
    if (typeof byGrade === 'number') return byGrade;
    return mech.from_price ?? pick?.price ?? fallback;
  }
  return pick?.price ?? fallback;
}

export default function CustomizeWizard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const mechanisms = useMemo(() => product.mechanisms ?? [], [product.mechanisms]);

  // Flatten fabric lines → per-colour items (in-stock first, then name).
  const items = useMemo<ColorItem[]>(
    () =>
      (product.fabrics ?? [])
        .flatMap((f) => (f.colors ?? []).map((c) => ({
          id: c.id, name: c.name, swatch_image_url: c.swatch_image_url, product_image_url: c.product_image_url ?? null,
          color_family: c.color_family, pattern_type: c.pattern_type, in_stock: c.in_stock,
          line_name: f.name, grade: f.grade, price: f.price,
        })))
        .sort((a, b) => (a.in_stock !== b.in_stock ? Number(b.in_stock) - Number(a.in_stock) : a.name.localeCompare(b.name))),
    [product.fabrics],
  );

  const [open, setOpen] = useState(true); // auto-open the landing prompt on entry
  const [step, setStep] = useState<Step>('landing');
  const [mech, setMech] = useState<Mechanism | null>(null);
  const [color, setColor] = useState<ColorItem | null>(null);
  const [line, setLine] = useState<Fabric | null>(null);
  const [material, setMaterial] = useState<string | null>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [lineGrade, setLineGrade] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const hasMech = mechanisms.length > 0;
  // User-facing noun for the piece — SoMo mechanism frames also cover sofas,
  // loveseats, and sectionals, so the copy can't hard-code "chair".
  const pieceNoun =
    /sectional/i.test(product.category ?? '') ? 'sectional'
    : /loveseat/i.test(product.category ?? '') ? 'loveseat'
    : /sofa/i.test(product.category ?? '') ? 'sofa'
    : 'chair';
  const PieceNoun = pieceNoun.charAt(0).toUpperCase() + pieceNoun.slice(1);
  // Which fabric-step grid: the per-COLOUR isolated-swatch grid (Southern Motion,
  // whose library is presented as individual colour swatches) vs the grade-based
  // fabric-LINE grid (Chairs America). Keyed on how much of the library actually
  // HAS isolated swatches — NOT on mechanisms. The old `hasMech` proxy conflated
  // the two: a single-motion SoMo piece (e.g. a Point Break sofa) has no mechanism
  // options yet still ships 200+ colour swatches, and mustn't be dropped to the
  // line grid. Coverage also preserves the CA guard the proxy was standing in for
  // — a stray verified colour on an otherwise grade-based line stays on the line
  // grid because a handful of swatches won't clear the bar (SoMo returns ~58
  // colour-bearing fabrics for any product; CA returns 0).
  const fabricsWithColors = (product.fabrics ?? []).filter((f) => (f.colors?.length ?? 0) > 0).length;
  const useColorGrid = fabricsWithColors >= 2;

  // Facet option lists with counts, over the full item set.
  const facets = useMemo(() => {
    const tally = (key: (i: ColorItem) => string | null) => {
      const m = new Map<string, number>();
      for (const it of items) { const v = key(it); if (v) m.set(v, (m.get(v) ?? 0) + 1); }
      return m;
    };
    const mats = tally((i) => gradeMaterial(i.grade));
    const fams = tally((i) => i.color_family);
    return {
      materials: [...mats.entries()].sort((a, b) => b[1] - a[1]),
      families: [...fams.entries()].sort((a, b) => FAMILY_ORDER.indexOf(a[0]) - FAMILY_ORDER.indexOf(b[0])),
    };
  }, [items]);

  const filtered = useMemo(
    () => items.filter((i) => (!material || gradeMaterial(i.grade) === material) && (!family || i.color_family === family)),
    [items, material, family],
  );

  // Fabric-only (Chairs America): pick from the fabric LINES directly, in-stock
  // first then grade then name — each line has its own swatch + grade price.
  const lines = useMemo<Fabric[]>(
    () =>
      [...(product.fabrics ?? [])].sort((a, b) =>
        a.in_stock !== b.in_stock
          ? Number(b.in_stock) - Number(a.in_stock)
          : (a.grade ?? '9').localeCompare(b.grade ?? '9') || a.name.localeCompare(b.name)),
    [product.fabrics],
  );
  const gradeFacets = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of lines) { if (f.grade) m.set(f.grade, (m.get(f.grade) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [lines]);
  const filteredLines = useMemo(
    () => lines.filter((f) => !lineGrade || f.grade === lineGrade),
    [lines, lineGrade],
  );

  if (!items.length && !lines.length) return null;

  // The active fabric pick (per-colour item or fabric line) — both carry a grade
  // + line price, so pricing is uniform.
  const pick = color ?? line ?? null;
  const price = priceFor(mech, pick, Number(product.retail_price));
  // Stock chair photo shown while picking mechanism + fabric (never a synthetic
  // render — accuracy). Review prefers the real floor photo of this colour.
  const heroImage = product.image_url ?? product.images?.[0] ?? null;
  const reviewImage = color?.product_image_url ?? color?.swatch_image_url ?? line?.swatch_image_url ?? null;
  const reviewIsPhoto = !!color?.product_image_url;
  // Fabric display label + grade text, from whichever pick shape is set.
  const fabricLabel = color ? `${color.line_name} ${color.name}` : line ? line.name : '';
  const gradeText = color ? (color.grade ? gradeMaterial(color.grade) : '') : line?.grade ? `Grade ${line.grade}` : '';

  function launch() {
    setStep('landing'); setMech(null); setColor(null); setLine(null);
    setMaterial(null); setFamily(null); setLineGrade(null); setAdded(false); setOpen(true);
  }

  function handleAdd() {
    if (!fabricLabel) return;
    // With a mechanism (SoMo) the chosen mechanism frame is the product/SKU;
    // fabric-only (CA) books the frame itself.
    const fid = mech ? mech.id : product.id;
    const fsku = mech ? mech.sku : product.sku;
    const mechPrefix = mech ? `${mech.label} · ` : '';
    const img = color?.product_image_url ?? color?.swatch_image_url ?? line?.swatch_image_url ?? product.image_url ?? null;
    addItem({
      product_id: fid, fabric_id: color?.id ?? line?.id, fabric_name: fabricLabel,
      sku: `${fsku}::${fabricLabel}`,
      name: `${product.collection ?? product.name} — ${mechPrefix}${fabricLabel}`,
      price, image_url: img,
      category: product.category,
    });
    setAdded(true);
  }

  const StepDots = () => {
    const order: Step[] = hasMech ? ['mechanism', 'fabric', 'review'] : ['fabric', 'review'];
    const idx = order.indexOf(step);
    if (idx < 0) return null;
    return (
      <div className="flex items-center gap-1.5">
        {order.map((s, i) => (
          <span key={s} className={`h-1.5 rounded-full transition-all ${i <= idx ? 'w-6 bg-brand-yellow' : 'w-3 bg-brand-border'}`} />
        ))}
      </div>
    );
  };

  const Chip = ({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${active ? 'bg-brand-charcoal text-white border-brand-charcoal' : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-charcoal-light'}`}>
      {label} <span className={active ? 'opacity-70' : 'text-brand-charcoal-light'}>{count}</span>
    </button>
  );

  return (
    <>
      <button type="button" onClick={launch}
        className="mt-5 w-full rounded-xl border-2 border-brand-yellow bg-brand-yellow/10 px-5 py-3 text-sm font-semibold text-brand-charcoal hover:bg-brand-yellow/20 transition-colors">
        ✨ Customize this {pieceNoun} — pick your {hasMech ? 'mechanism & fabric' : 'fabric'}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Customize your ${pieceNoun}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => setOpen(false)}>
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-border px-5 py-3">
              <div className="flex items-center gap-3">
                {step !== 'landing' && step !== 'mechanism' && (
                  <button type="button" aria-label="Back" onClick={() => setStep(step === 'review' ? 'fabric' : hasMech ? 'mechanism' : 'landing')}
                    className="text-brand-charcoal-light hover:text-brand-charcoal text-lg leading-none">‹</button>
                )}
                <span className="text-sm font-semibold text-brand-charcoal">
                  {step === 'landing' ? product.collection ?? product.name
                    : step === 'mechanism' ? 'Choose your mechanism'
                    : step === 'fabric' ? 'Choose your fabric'
                    : `Review your ${pieceNoun}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StepDots />
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-brand-charcoal-light hover:text-brand-charcoal text-xl leading-none">×</button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Stock chair photo — persistent across landing/mechanism; the fabric
                  grid is tall enough on its own, and review has its own image. */}
              {(step === 'landing' || step === 'mechanism') && heroImage && (
                <div className="mb-4 overflow-hidden rounded-xl border border-brand-border bg-brand-warm-gray">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImage} alt={product.collection ?? product.name}
                    className={`mx-auto w-full object-contain ${step === 'landing' ? 'max-h-64' : 'max-h-40'}`} />
                </div>
              )}

              {/* LANDING — in-stock is the primary (green) action on top; customize
                  is the secondary (yellow) beneath it. */}
              {step === 'landing' && (
                <div className="text-center py-4">
                  {!heroImage && <div className="text-3xl">🛋️</div>}
                  <h3 className="mt-3 text-lg font-bold text-brand-charcoal">Make it yours</h3>
                  <p className="mt-1 text-sm text-brand-charcoal-light">Shop one that&apos;s ready to deliver, or customize yours to order.</p>
                  <div className="mt-6 flex flex-col gap-2">
                    <button type="button" onClick={() => setOpen(false)} className="w-full py-3 text-sm rounded-lg font-semibold text-white bg-brand-green hover:opacity-90 transition-opacity">Shop In Stock</button>
                    <button type="button" onClick={() => setStep(hasMech ? 'mechanism' : 'fabric')} className="btn-brand w-full py-3 text-sm">{hasMech ? `Customize My ${PieceNoun}` : 'Customize Fabric'}</button>
                  </div>
                </div>
              )}

              {/* MECHANISM */}
              {step === 'mechanism' && (
                <ul className="flex flex-col gap-2">
                  {mechanisms.map((m) => {
                    const active = mech?.id === m.id;
                    return (
                      <li key={m.id}>
                        <button type="button" onClick={() => { setMech(m); setStep('fabric'); }}
                          className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors ${active ? 'border-brand-yellow bg-brand-yellow/5' : 'border-brand-border hover:border-brand-charcoal-light'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-brand-charcoal">{m.label}</span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${m.in_stock ? 'text-brand-green' : 'text-brand-charcoal-light'}`}>{m.in_stock ? 'In stock' : 'Made to order'}</span>
                          </div>
                          {m.description && <p className="mt-1 text-xs text-brand-charcoal-light">{m.description}</p>}
                          {typeof m.from_price === 'number' && <div className="mt-1 text-xs font-medium text-brand-charcoal">from ${m.from_price.toFixed(2)}</div>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* FABRIC (SoMo) — per-colour faceted grid (isolated swatches, lazy). */}
              {step === 'fabric' && useColorGrid && (
                <div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {facets.materials.length > 1 && facets.materials.map(([opt, n]) => (
                      <Chip key={`m-${opt}`} label={opt} count={n} active={material === opt} onClick={() => setMaterial(material === opt ? null : opt)} />
                    ))}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {facets.families.length > 1 && facets.families.map(([opt, n]) => (
                      <Chip key={`f-${opt}`} label={opt} count={n} active={family === opt} onClick={() => setFamily(family === opt ? null : opt)} />
                    ))}
                  </div>
                  <div className="mb-2 flex items-center justify-between text-xs text-brand-charcoal-light">
                    <span>{mech?.label}</span>
                    <span>{filtered.length}{(material || family) ? ` of ${items.length}` : ''} colors</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filtered.map((it) => {
                      const active = color?.id === it.id;
                      const p = priceFor(mech, it, Number(product.retail_price));
                      return (
                        <button key={it.id} type="button" onClick={() => { setColor(it); setStep('review'); }}
                          title={`${it.name} · ${it.line_name} — $${p.toFixed(2)}`} className="text-left group">
                          <span className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-brand-warm-gray transition-all ${active ? 'border-brand-yellow ring-2 ring-brand-yellow/30' : 'border-brand-border group-hover:border-brand-charcoal-light'}`}>
                            {it.swatch_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.swatch_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-base opacity-30">🧵</span>
                            )}
                            {it.in_stock && <span className="absolute bottom-0 inset-x-0 bg-brand-green text-white text-[8px] text-center py-0.5">In stock</span>}
                          </span>
                          <span className="mt-1 block text-[10px] leading-tight text-brand-charcoal-light break-words">{it.name}</span>
                        </button>
                      );
                    })}
                    {!filtered.length && <div className="col-span-full py-8 text-center text-sm text-brand-charcoal-light">No colors match these filters.</div>}
                  </div>
                </div>
              )}

              {/* FABRIC (Chairs America) — fabric LINE grid, filtered by grade. */}
              {step === 'fabric' && !useColorGrid && (
                <div>
                  {gradeFacets.length > 1 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {gradeFacets.map(([g, n]) => (
                        <Chip key={`g-${g}`} label={`Grade ${g}`} count={n} active={lineGrade === g} onClick={() => setLineGrade(lineGrade === g ? null : g)} />
                      ))}
                    </div>
                  )}
                  <div className="mb-2 flex items-center justify-between text-xs text-brand-charcoal-light">
                    <span>Made to order</span>
                    <span>{filteredLines.length}{lineGrade ? ` of ${lines.length}` : ''} fabrics</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredLines.map((f) => {
                      const active = line?.id === f.id;
                      const p = priceFor(mech, f, Number(product.retail_price));
                      return (
                        <button key={f.id} type="button" onClick={() => { setLine(f); setColor(null); setStep('review'); }}
                          title={`${f.name}${f.grade ? ` · Grade ${f.grade}` : ''} — $${p.toFixed(2)}`} className="text-left group">
                          <span className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-brand-warm-gray transition-all ${active ? 'border-brand-yellow ring-2 ring-brand-yellow/30' : 'border-brand-border group-hover:border-brand-charcoal-light'}`}>
                            {f.swatch_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={f.swatch_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-base opacity-30">🧵</span>
                            )}
                            {f.grade && <span className="absolute top-0 inset-x-0 bg-black/55 text-white text-[8px] text-center py-0.5">Grade {f.grade}</span>}
                            {f.in_stock && <span className="absolute bottom-0 inset-x-0 bg-brand-green text-white text-[8px] text-center py-0.5">In stock</span>}
                          </span>
                          <span className="mt-1 block text-[10px] leading-tight text-brand-charcoal-light break-words">{f.name}</span>
                        </button>
                      );
                    })}
                    {!filteredLines.length && <div className="col-span-full py-8 text-center text-sm text-brand-charcoal-light">No fabrics match.</div>}
                  </div>
                </div>
              )}

              {/* REVIEW */}
              {step === 'review' && (color || line) && (
                <div>
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-brand-warm-gray">
                      {reviewImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reviewImage} alt={fabricLabel} className={`h-full w-full ${reviewIsPhoto ? 'object-contain' : 'object-cover'}`} />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-2xl opacity-30">🧵</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-brand-charcoal">{product.collection ?? product.name}</div>
                      <dl className="mt-1 space-y-0.5 text-xs text-brand-charcoal-light">
                        {mech && <div><span className="font-medium text-brand-charcoal">Mechanism:</span> {mech.label}{mech.made_to_order ? ' (made to order)' : ''}</div>}
                        <div><span className="font-medium text-brand-charcoal">Fabric:</span> {fabricLabel}{gradeText ? ` · ${gradeText}` : ''}</div>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between border-t border-brand-border pt-4">
                    <span className="text-sm text-brand-charcoal-light">Your price</span>
                    <span className="text-2xl font-bold text-brand-charcoal">${price.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex gap-2 text-xs">
                    {hasMech && (
                      <>
                        <button type="button" onClick={() => setStep('mechanism')} className="text-brand-yellow-dark hover:underline">Change mechanism</button>
                        <span className="text-brand-border">·</span>
                      </>
                    )}
                    <button type="button" onClick={() => setStep('fabric')} className="text-brand-yellow-dark hover:underline">Change fabric</button>
                  </div>
                  <button type="button" onClick={handleAdd} disabled={added} className="btn-brand mt-5 w-full py-3 text-sm disabled:opacity-60">
                    {added ? '✓ Added to cart' : 'Add to Cart'}
                  </button>
                  {added && (
                    <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full text-center text-xs text-brand-charcoal-light hover:text-brand-charcoal">Keep shopping</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
