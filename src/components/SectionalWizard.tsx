'use client';

// ── SectionalWizard ───────────────────────────────────────────────────────
// List-based sectional configurator for the storefront. Three-step flow:
//
//   1. Pick a family (e.g. Tori, Kimpton)
//   2. Pick a color if the family has multiple
//   3. Pick piece counts → add the resolved SKUs to the cart as a
//      single "configured sectional" group
//
// Uses the same SKU matching rules as the DeliverDesk admin canvas
// configurator (src/lib/sectional.ts → matchPieceToProduct) so both
// apps resolve identical SKUs for identical family + color + piece
// triples. A future Phase 3.A.2 will add the full canvas configurator
// back in from the ported source at DeliverDeskFrontEnd/src/sectional/
// builder.js; this wizard stays as the simple mobile-friendly path.

import { useState, useEffect, useMemo } from 'react';
import {
  SECTIONAL_PIECES,
  fetchSectionalFamilies,
  matchConfiguration,
  configurationTotal,
  type SectionalFamily,
  type SelectedPiece,
  type SectionalGroup,
} from '@/lib/sectional';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

interface Props {
  /** Optional pre-seeded family from the product-page "Build your own" CTA */
  seedFamily?: string;
  /** Optional pre-seeded color from the product-page "Build your own" CTA */
  seedColor?:  string;
}

// Step 1 is only rendered when we're NOT pre-seeded from a product page.
type Step = 'pick-family' | 'pick-color' | 'pick-pieces' | 'review' | 'done';

const GROUP_ORDER: SectionalGroup[] = ['Sofas', 'Chaises', 'Loveseats', 'Chairs', 'Ottomans'];

export default function SectionalWizard({ seedFamily, seedColor }: Props) {
  const { addItem } = useCart();

  // Master data from the API
  const [families,  setFamilies]  = useState<SectionalFamily[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Wizard state
  const initialStep: Step = seedFamily
    ? (seedColor ? 'pick-pieces' : 'pick-color')
    : 'pick-family';
  const [step, setStep] = useState<Step>(initialStep);
  const [family, setFamily] = useState<string>(seedFamily || '');
  const [color,  setColor]  = useState<string>(seedColor  || '');

  // Counters per piece id. { 'armless-chair': 2, 'corner': 1, ... }
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Review stage state — resolved selection + totals
  const [resolving, setResolving] = useState(false);
  const [resolved,  setResolved]  = useState<SelectedPiece[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchSectionalFamilies();
        if (cancelled) return;
        setFamilies(list);
      } catch (err) {
        if (cancelled) return;
        setLoadError('Failed to load our sectional collections. Please refresh the page or give us a call.');
        console.error('[SectionalWizard] load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Derived: the family record for the currently-picked family, if any
  const familyRecord = useMemo(
    () => families.find(f => f.family === family) || null,
    [families, family]
  );

  function increment(pieceId: string) {
    setCounts(c => ({ ...c, [pieceId]: (c[pieceId] || 0) + 1 }));
  }
  function decrement(pieceId: string) {
    setCounts(c => {
      const next = Math.max(0, (c[pieceId] || 0) - 1);
      const copy = { ...c };
      if (next === 0) delete copy[pieceId];
      else copy[pieceId] = next;
      return copy;
    });
  }

  const totalSelected = useMemo(
    () => Object.values(counts).reduce((s, n) => s + n, 0),
    [counts]
  );

  // Transition to the review step: run the SKU matcher and populate
  // `resolved` with the pieces + their matched products.
  async function goToReview() {
    setResolving(true);
    setResolveError(null);
    try {
      const selections: SelectedPiece[] = Object.entries(counts).map(
        ([pieceId, qty]) => ({ pieceId, qty, matched: null })
      );
      const matched = await matchConfiguration(selections, family, color);
      setResolved(matched);
      setStep('review');
    } catch (err) {
      console.error('[SectionalWizard] match failed:', err);
      setResolveError("We couldn't look up your selections right now. Please try again or give us a call.");
    } finally {
      setResolving(false);
    }
  }

  // Add every successfully-matched piece to the cart. Each piece becomes
  // its own cart line item (with a shared sectional_config tag so the
  // cart page can group them visually — we leave the tag empty for now
  // and rely on category/naming to group).
  function addConfigurationToCart() {
    const signature = `${family}::${color || 'default'}::${Date.now()}`;
    for (const s of resolved) {
      if (!s.matched || s.qty <= 0) continue;
      addItem({
        product_id:       s.matched.id,
        sku:              s.matched.sku,
        name:             s.matched.name,
        price:            Number(s.matched.retail_price),
        image_url:        s.matched.image_url || null,
        category:         s.matched.category || 'Sectional',
        qty:              s.qty,
        sectional_config: signature,
      });
    }
    setStep('done');
  }

  function resetForNewBuild() {
    setFamily(seedFamily || '');
    setColor(seedColor || '');
    setCounts({});
    setResolved([]);
    setStep(seedFamily ? (seedColor ? 'pick-pieces' : 'pick-color') : 'pick-family');
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-8 text-center">
        <p className="text-brand-charcoal-light">Loading sectional collections…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
        <p className="text-red-700">{loadError}</p>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-8 text-center">
        <div className="text-4xl mb-3 opacity-30">🛋</div>
        <h2 className="text-lg font-semibold text-brand-charcoal mb-2">
          No sectionals available right now
        </h2>
        <p className="text-sm text-brand-charcoal-light mb-4">
          Our sectional collections are out of stock at the moment. Give us a call to ask about custom orders.
        </p>
        <a href="tel:+12052385076" className="btn-brand inline-block">
          Call (205) 238-5076
        </a>
      </div>
    );
  }

  // ── STEP: pick-family ─────────────────────────────────────────────
  if (step === 'pick-family') {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">
          Build your sectional
        </h2>
        <p className="text-sm text-brand-charcoal-light mb-6">
          Pick a collection to start. Each collection has its own styling and finish options.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map(f => (
            <button
              key={f.family}
              type="button"
              onClick={() => {
                setFamily(f.family);
                setStep(f.colors.length > 1 ? 'pick-color' : 'pick-pieces');
                if (f.colors.length === 1) setColor(f.colors[0]);
              }}
              className="text-left rounded-xl border border-brand-border overflow-hidden hover:border-brand-yellow hover:shadow-md transition-all"
            >
              <div className="aspect-[4/3] bg-brand-warm-gray flex items-center justify-center overflow-hidden">
                {f.sample_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.sample_image} alt={f.family} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl opacity-30">🛋</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-brand-charcoal">{f.family}</h3>
                <p className="text-xs text-brand-charcoal-light mt-1">
                  {f.piece_count} piece{f.piece_count === 1 ? '' : 's'}
                  {f.colors.length > 0 && ` · ${f.colors.length} color${f.colors.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── STEP: pick-color ──────────────────────────────────────────────
  if (step === 'pick-color' && familyRecord) {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-2xl mx-auto">
        <WizardBreadcrumb
          family={family}
          color={null}
          onBack={() => { setFamily(''); setStep('pick-family'); }}
          showBack={!seedFamily}
        />
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">
          Choose your color
        </h2>
        <p className="text-sm text-brand-charcoal-light mb-6">
          The <strong>{family}</strong> collection comes in {familyRecord.colors.length} colors. Pick one to continue — this determines which pieces we match to your configuration.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {familyRecord.colors.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setStep('pick-pieces'); }}
              className="p-4 rounded-lg border-2 border-brand-border text-left hover:border-brand-yellow transition-colors"
            >
              <p className="font-semibold text-brand-charcoal">{c}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── STEP: pick-pieces ─────────────────────────────────────────────
  if (step === 'pick-pieces') {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-3xl mx-auto">
        <WizardBreadcrumb
          family={family}
          color={color}
          onBack={() => {
            if (familyRecord && familyRecord.colors.length > 1) {
              setStep('pick-color');
            } else if (!seedFamily) {
              setStep('pick-family');
            }
          }}
          showBack={!seedFamily || (familyRecord?.colors.length ?? 0) > 1}
        />
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">
          Pick your pieces
        </h2>
        <p className="text-sm text-brand-charcoal-light mb-6">
          Tap + to add pieces to your sectional. Most customers start with a sofa or loveseat anchor, then add armless chairs, a corner, or a chaise to reach their target shape.
        </p>

        <div className="space-y-6 mb-6">
          {GROUP_ORDER.map(group => {
            const groupPieces = SECTIONAL_PIECES.filter(p => p.group === group);
            if (groupPieces.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">
                  {group}
                </h3>
                <div className="space-y-2">
                  {groupPieces.map(piece => {
                    const qty = counts[piece.id] || 0;
                    return (
                      <div
                        key={piece.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                          qty > 0 ? 'border-brand-yellow bg-brand-yellow-light' : 'border-brand-border'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-brand-charcoal">{piece.label}</p>
                          {piece.hint && (
                            <p className="text-xs text-brand-charcoal-light mt-0.5">{piece.hint}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => decrement(piece.id)}
                            disabled={qty === 0}
                            aria-label={`Remove one ${piece.label}`}
                            className="w-8 h-8 rounded-full border border-brand-border text-brand-charcoal hover:border-brand-yellow-dark disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-semibold text-brand-charcoal">{qty}</span>
                          <button
                            type="button"
                            onClick={() => increment(piece.id)}
                            aria-label={`Add one ${piece.label}`}
                            className="w-8 h-8 rounded-full border border-brand-border text-brand-charcoal hover:border-brand-yellow-dark text-lg leading-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {resolveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {resolveError}
          </div>
        )}

        <div className="flex items-center justify-between pt-5 border-t border-brand-border">
          <p className="text-sm text-brand-charcoal-light">
            {totalSelected} piece{totalSelected === 1 ? '' : 's'} selected
          </p>
          <button
            type="button"
            onClick={goToReview}
            disabled={totalSelected === 0 || resolving}
            className="btn-brand px-6 py-3 disabled:opacity-50"
          >
            {resolving ? 'Matching pieces…' : 'Review configuration'}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: review ──────────────────────────────────────────────────
  if (step === 'review') {
    const total   = configurationTotal(resolved);
    const anyFail = resolved.some(s => !s.matched);
    const okRows  = resolved.filter(s => s.matched);

    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-3xl mx-auto">
        <WizardBreadcrumb
          family={family}
          color={color}
          onBack={() => setStep('pick-pieces')}
          showBack
        />
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">
          Review your sectional
        </h2>
        <p className="text-sm text-brand-charcoal-light mb-6">
          Here&apos;s what we&apos;re adding to your cart. You&apos;ll be able to check delivery availability on the next page.
        </p>

        <div className="rounded-lg border border-brand-border divide-y divide-brand-border mb-4">
          {resolved.map((s, i) => {
            const def = SECTIONAL_PIECES.find(p => p.id === s.pieceId);
            return (
              <div key={i} className="flex items-start justify-between gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-charcoal">
                    {def?.label || s.pieceId} <span className="text-brand-charcoal-light font-normal">× {s.qty}</span>
                  </p>
                  {s.matched ? (
                    <p className="text-xs text-brand-charcoal-light mt-1 truncate">
                      {s.matched.name} <span className="font-mono">· {s.matched.sku}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 mt-1">{s.error}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {s.matched ? (
                    <p className="text-sm font-semibold text-brand-charcoal">
                      ${(Number(s.matched.retail_price) * s.qty).toFixed(2)}
                    </p>
                  ) : (
                    <span className="text-xs text-red-600">Unavailable</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between bg-brand-warm-gray rounded-lg px-4 py-3 mb-5">
          <p className="text-sm text-brand-charcoal-light">
            Total ({okRows.reduce((s, r) => s + r.qty, 0)} {okRows.reduce((s, r) => s + r.qty, 0) === 1 ? 'piece' : 'pieces'})
          </p>
          <p className="text-xl font-bold text-brand-charcoal">${total.toFixed(2)}</p>
        </div>

        {anyFail && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Some pieces couldn&apos;t be matched in your chosen color. You can go back to pick different options, or add the available pieces to your cart and call us to arrange the rest.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setStep('pick-pieces')}
            className="btn-outline flex-1 py-3"
          >
            Back to pieces
          </button>
          <button
            type="button"
            onClick={addConfigurationToCart}
            disabled={okRows.length === 0}
            className="btn-brand flex-1 py-3 disabled:opacity-50"
          >
            Add {okRows.reduce((s, r) => s + r.qty, 0)} piece{okRows.reduce((s, r) => s + r.qty, 0) === 1 ? '' : 's'} to cart
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: done ────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-8 text-center max-w-2xl mx-auto">
      <div className="w-14 h-14 mx-auto rounded-full bg-brand-green-light flex items-center justify-center text-brand-green mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-brand-charcoal mb-2">
        Sectional added to your cart
      </h2>
      <p className="text-sm text-brand-charcoal-light mb-6">
        Your <strong>{family}</strong>{color && <> in <strong>{color}</strong></>} configuration is ready to check out. You can add more items or head straight to checkout.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/cart" className="btn-brand px-6 py-3">
          Go to cart
        </Link>
        <button type="button" onClick={resetForNewBuild} className="btn-outline px-6 py-3">
          Build another
        </button>
      </div>
    </div>
  );
}

// ── Breadcrumb helper ────────────────────────────────────────────────

function WizardBreadcrumb({
  family, color, onBack, showBack,
}: {
  family: string;
  color:  string | null;
  onBack: () => void;
  showBack: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2 text-sm text-brand-charcoal-light">
        <span className="font-semibold text-brand-charcoal">{family}</span>
        {color && (
          <>
            <span>·</span>
            <span className="font-semibold text-brand-charcoal">{color}</span>
          </>
        )}
      </div>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-brand-charcoal-light hover:text-brand-charcoal underline"
        >
          ← Change
        </button>
      )}
    </div>
  );
}
