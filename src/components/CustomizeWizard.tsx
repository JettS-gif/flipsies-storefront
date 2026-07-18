'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product, Mechanism, Fabric } from '@/lib/api';

// Guided customization flow (A/B concept, Southern Motion — Bank Shot trial).
// Concept (Jett): on the PDP a shopper is offered "customize, or shop what's in
// stock?"; the customize path walks mechanism → fabric → add to cart. Both axes
// already ride on the product payload (mechanisms[] + fabrics[]); the pairing
// price is the chosen mechanism's grade→price map indexed by the fabric's grade
// (Fabric/Accent/L1/L2), so no extra fetch. This is a prototype to experience-
// test the flow, not the fully-wired production configurator.
//
// Scoped to one model by the caller so it can be A/B'd against the normal PDP.

type Step = 'landing' | 'mechanism' | 'fabric' | 'review';

const GRADE_LABEL: Record<string, string> = {
  Fabric: 'Fabric', Accent: 'Accent', L1: 'Leather', L2: 'Premium Leather',
};

function priceFor(mech: Mechanism | null, fabric: Fabric | null, fallback: number): number {
  if (!mech) return fallback;
  const grade = fabric?.grade ?? 'Fabric';
  const byGrade = mech.grade_prices?.[grade];
  if (typeof byGrade === 'number') return byGrade;
  return mech.from_price ?? fabric?.price ?? fallback;
}

export default function CustomizeWizard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const mechanisms = useMemo(() => product.mechanisms ?? [], [product.mechanisms]);
  // In-stock first, then grade, then name — same ordering as the fabric library.
  const fabrics = useMemo(
    () =>
      [...(product.fabrics ?? [])].sort((a, b) => {
        if (a.in_stock !== b.in_stock) return Number(b.in_stock) - Number(a.in_stock);
        const ga = a.grade ?? '~', gb = b.grade ?? '~';
        if (ga !== gb) return ga.localeCompare(gb);
        return a.name.localeCompare(b.name);
      }),
    [product.fabrics],
  );

  const [open, setOpen] = useState(true); // auto-open the landing prompt on entry
  const [step, setStep] = useState<Step>('landing');
  const [mech, setMech] = useState<Mechanism | null>(null);
  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [added, setAdded] = useState(false);

  if (!mechanisms.length || !fabrics.length) return null;

  const price = priceFor(mech, fabric, Number(product.retail_price));
  // Stock chair photo shown while the shopper picks mechanism + fabric. This is
  // the single seam for the planned "render the chair in the chosen fabric"
  // step — swap heroImage for the rendered composite when that ships.
  const heroImage = product.image_url ?? product.images?.[0] ?? null;

  function launch() {
    setStep('landing');
    setMech(null);
    setFabric(null);
    setAdded(false);
    setOpen(true);
  }

  function handleAdd() {
    if (!mech || !fabric) return;
    addItem({
      product_id: mech.id,
      fabric_id: fabric.id,
      fabric_name: fabric.name,
      sku: `${mech.sku}::${fabric.name}`,
      name: `${product.collection ?? product.name} — ${mech.label} · ${fabric.name}`,
      price,
      image_url: fabric.swatch_image_url ?? product.image_url ?? null,
      category: product.category,
    });
    setAdded(true);
  }

  // Small pieces --------------------------------------------------------------
  const StepDots = () => {
    const order: Step[] = ['mechanism', 'fabric', 'review'];
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

  return (
    <>
      {/* Always-available entry point (also survives dismissing the auto-prompt). */}
      <button
        type="button"
        onClick={launch}
        className="mt-5 w-full rounded-xl border-2 border-brand-yellow bg-brand-yellow/10 px-5 py-3 text-sm font-semibold text-brand-charcoal hover:bg-brand-yellow/20 transition-colors"
      >
        ✨ Customize this chair — pick your mechanism &amp; fabric
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Customize your chair"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-border px-5 py-3">
              <div className="flex items-center gap-3">
                {step !== 'landing' && step !== 'mechanism' && (
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => setStep(step === 'review' ? 'fabric' : 'mechanism')}
                    className="text-brand-charcoal-light hover:text-brand-charcoal text-lg leading-none"
                  >
                    ‹
                  </button>
                )}
                <span className="text-sm font-semibold text-brand-charcoal">
                  {step === 'landing' ? product.collection ?? product.name
                    : step === 'mechanism' ? 'Choose your mechanism'
                    : step === 'fabric' ? 'Choose your fabric'
                    : 'Review your chair'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StepDots />
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-brand-charcoal-light hover:text-brand-charcoal text-xl leading-none">×</button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Stock chair photo — persistent across the choice steps so the
                  shopper always sees what they're customizing. Review has its own
                  swatch composite, so skip it there. */}
              {step !== 'review' && heroImage && (
                <div className="mb-4 overflow-hidden rounded-xl border border-brand-border bg-brand-warm-gray">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImage}
                    alt={product.collection ?? product.name}
                    className={`mx-auto w-full object-contain ${step === 'landing' ? 'max-h-64' : 'max-h-40'}`}
                  />
                </div>
              )}

              {/* LANDING */}
              {step === 'landing' && (
                <div className="text-center py-4">
                  {!heroImage && <div className="text-3xl">🛋️</div>}
                  <h3 className="mt-3 text-lg font-bold text-brand-charcoal">Make it yours</h3>
                  <p className="mt-1 text-sm text-brand-charcoal-light">
                    Would you like to customize your chair today, or choose one that&apos;s in stock?
                  </p>
                  <div className="mt-6 flex flex-col gap-2">
                    <button type="button" onClick={() => setStep('mechanism')} className="btn-brand w-full py-3 text-sm">
                      Customize my chair
                    </button>
                    <button type="button" onClick={() => setOpen(false)} className="btn-outline w-full py-3 text-sm">
                      Shop what&apos;s in stock
                    </button>
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
                        <button
                          type="button"
                          onClick={() => { setMech(m); setStep('fabric'); }}
                          className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors ${
                            active ? 'border-brand-yellow bg-brand-yellow/5' : 'border-brand-border hover:border-brand-charcoal-light'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-brand-charcoal">{m.label}</span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${m.in_stock ? 'text-brand-green' : 'text-brand-charcoal-light'}`}>
                              {m.in_stock ? 'In stock' : 'Made to order'}
                            </span>
                          </div>
                          {m.description && <p className="mt-1 text-xs text-brand-charcoal-light">{m.description}</p>}
                          {typeof m.from_price === 'number' && (
                            <div className="mt-1 text-xs font-medium text-brand-charcoal">from ${m.from_price.toFixed(2)}</div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* FABRIC */}
              {step === 'fabric' && (
                <div>
                  <p className="mb-3 text-xs text-brand-charcoal-light">
                    {mech?.label} · tap a fabric to see your price.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {fabrics.map((f) => {
                      const active = fabric?.id === f.id;
                      const p = priceFor(mech, f, Number(product.retail_price));
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => { setFabric(f); setStep('review'); }}
                          title={`${f.name}${f.grade ? ` · ${GRADE_LABEL[f.grade] ?? f.grade}` : ''} — $${p.toFixed(2)}`}
                          className="text-left group"
                        >
                          <span className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-brand-warm-gray transition-all ${
                            active ? 'border-brand-yellow ring-2 ring-brand-yellow/30' : 'border-brand-border group-hover:border-brand-charcoal-light'
                          }`}>
                            {f.swatch_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={f.swatch_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-base opacity-30">🧵</span>
                            )}
                            {f.in_stock && (
                              <span className="absolute bottom-0 inset-x-0 bg-brand-green text-white text-[8px] text-center py-0.5">In stock</span>
                            )}
                          </span>
                          <span className="mt-1 block text-[10px] leading-tight text-brand-charcoal-light break-words">{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* REVIEW */}
              {step === 'review' && mech && fabric && (
                <div>
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-brand-warm-gray">
                      {fabric.swatch_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fabric.swatch_image_url} alt={fabric.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-2xl opacity-30">🧵</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-brand-charcoal">{product.collection ?? product.name}</div>
                      <dl className="mt-1 space-y-0.5 text-xs text-brand-charcoal-light">
                        <div><span className="font-medium text-brand-charcoal">Mechanism:</span> {mech.label}{mech.made_to_order ? ' (made to order)' : ''}</div>
                        <div><span className="font-medium text-brand-charcoal">Fabric:</span> {fabric.name}{fabric.grade ? ` · ${GRADE_LABEL[fabric.grade] ?? fabric.grade}` : ''}</div>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between border-t border-brand-border pt-4">
                    <span className="text-sm text-brand-charcoal-light">Your price</span>
                    <span className="text-2xl font-bold text-brand-charcoal">${price.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex gap-2 text-xs">
                    <button type="button" onClick={() => setStep('mechanism')} className="text-brand-yellow-dark hover:underline">Change mechanism</button>
                    <span className="text-brand-border">·</span>
                    <button type="button" onClick={() => setStep('fabric')} className="text-brand-yellow-dark hover:underline">Change fabric</button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={added}
                    className="btn-brand mt-5 w-full py-3 text-sm disabled:opacity-60"
                  >
                    {added ? '✓ Added to cart' : 'Add to Cart'}
                  </button>
                  {added && (
                    <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full text-center text-xs text-brand-charcoal-light hover:text-brand-charcoal">
                      Keep shopping
                    </button>
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
