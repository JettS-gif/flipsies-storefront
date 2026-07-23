'use client';

// ── SectionalWizard (data-driven) ─────────────────────────────────────────
// Pick a family → color → the pieces THAT FAMILY ACTUALLY CARRIES (only those,
// with real prices + a merchandising gallery of the full sectional) → cart.
// Pieces/prices/SKUs come pre-resolved from GET /storefront/sectional-families
// and /:family, so there's no client-side SKU guessing.

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import {
  fetchSectionalFamilies,
  fetchSectionalFamily,
  PIECE_META,
  GROUP_ORDER,
  type SectionalFamily,
  type SectionalFamilyDetail,
} from '@/lib/sectional';
import {
  parseDimensions, computeFootprint, formatFootprint,
  autoPlace, removeLastOfType, DEFS_BY_ID, SECT_U,
  type PlacedPiece, type Dim,
} from '@/lib/sectionalCanvas';
import SectionalCanvas from '@/components/SectionalCanvas';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

interface Props {
  seedFamily?: string;
  seedColor?: string;
}

type Step = 'pick-family' | 'pick-color' | 'pick-pieces' | 'review' | 'done';

export default function SectionalWizard({ seedFamily, seedColor }: Props) {
  const { addItem } = useCart();

  const [families, setFamilies] = useState<SectionalFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [family, setFamily] = useState<string>(seedFamily || '');
  const [color, setColor] = useState<string>(seedColor || '');
  // Single source of truth for the configuration — the list (counts) and the
  // canvas visualizer are two editors of this one placed-piece array.
  const [placed, setPlaced] = useState<PlacedPiece[]>([]);
  const [showDims, setShowDims] = useState(false);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of placed) c[p.defId] = (c[p.defId] || 0) + 1;
    return c;
  }, [placed]);
  const [step, setStep] = useState<Step>(seedFamily ? 'pick-color' : 'pick-family');

  const [detail, setDetail] = useState<SectionalFamilyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Family list (for the pick-family grid).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchSectionalFamilies();
        if (!cancelled) setFamilies(list);
      } catch (err) {
        if (!cancelled) setLoadError('Failed to load our sectional collections. Please refresh or give us a call.');
        console.error('[SectionalWizard] families load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Family detail (colors, gallery, available pieces) whenever the family changes.
  useEffect(() => {
    if (!family) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    fetchSectionalFamily(family)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        if (!d) { setDetailError('This collection isn’t available right now.'); return; }
        if (d.colors.length > 1) {
          if (seedColor && family === seedFamily && d.colors.includes(seedColor)) {
            setColor(seedColor);
            setStep('pick-pieces');
          } else {
            setStep('pick-color');
          }
        } else {
          setColor(d.colors[0] || '');
          setStep('pick-pieces');
        }
      })
      .catch((err) => {
        if (!cancelled) setDetailError('Failed to load this collection. Please try again.');
        console.error('[SectionalWizard] detail load failed:', err);
      })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [family, seedFamily, seedColor]);

  // Pieces this family carries in the chosen color, with the resolved product.
  const availablePieces = useMemo(() => {
    if (!detail) return [];
    return detail.pieces
      .map((pt) => {
        const meta = PIECE_META[pt.piece_type];
        const product = color
          ? pt.products.find((pr) => pr.color === color) || null
          : pt.products[0] || null;
        return meta && product ? { piece_type: pt.piece_type, meta, product } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(
        (a, b) =>
          GROUP_ORDER.indexOf(a.meta.group) - GROUP_ORDER.indexOf(b.meta.group) ||
          a.meta.order - b.meta.order,
      );
  }, [detail, color]);

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({ group: g, items: availablePieces.filter((x) => x.meta.group === g) })).filter(
        (g) => g.items.length > 0,
      ),
    [availablePieces],
  );

  // Canvas inputs: the piece types this family+color carries, and real per-piece
  // dims keyed by sectional_piece_type (prefer the chosen color's row).
  const allowedTypes = useMemo(() => availablePieces.map((x) => x.piece_type), [availablePieces]);
  const dimsByType = useMemo(() => {
    const map: Record<string, Dim | undefined> = {};
    if (!detail) return map;
    for (const pt of detail.pieces) {
      const inColor = color ? pt.products.find((p) => p.color === color && p.dimensions) : null;
      const anyDim = pt.products.find((p) => p.dimensions);
      const dim = parseDimensions((inColor || anyDim)?.dimensions || null);
      if (dim) map[pt.piece_type] = dim;
    }
    return map;
  }, [detail, color]);
  const footprint = useMemo(() => computeFootprint(placed, dimsByType, DEFS_BY_ID, SECT_U), [placed, dimsByType]);
  const footprintLabel = formatFootprint(footprint);
  const dimsLoaded = Object.keys(dimsByType).length > 0;

  const resolved = availablePieces
    .filter((x) => (counts[x.piece_type] || 0) > 0)
    .map((x) => ({ ...x, qty: counts[x.piece_type] }));
  const totalPieces = resolved.reduce((s, r) => s + r.qty, 0);
  const total = resolved.reduce((s, r) => s + r.product.price * r.qty, 0);

  function selectFamily(fam: string) {
    setPlaced([]);
    setColor('');
    setFamily(fam); // detail effect drives the next step
  }
  function increment(id: string) {
    setPlaced((prev) => [...prev, autoPlace(prev, id)]);
  }
  function decrement(id: string) {
    setPlaced((prev) => removeLastOfType(prev, id));
  }
  function addToCart() {
    const signature = `${family}::${color || 'default'}::${Date.now()}`;
    for (const r of resolved) {
      addItem({
        product_id: r.product.id,
        sku: r.product.sku,
        name: r.product.name,
        price: r.product.price,
        image_url: r.product.image_url,
        category: 'Sectional',
        qty: r.qty,
        sectional_config: signature,
      });
    }
    setStep('done');
  }
  function resetForNewBuild() {
    setPlaced([]);
    if (seedFamily) { setStep(seedColor ? 'pick-pieces' : 'pick-color'); }
    else { setFamily(''); setColor(''); setDetail(null); setStep('pick-family'); }
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return <Shell><p className="text-brand-charcoal-light">Loading sectional collections…</p></Shell>;
  }
  if (loadError) {
    return <Shell tone="error"><p className="text-red-700">{loadError}</p></Shell>;
  }
  if (families.length === 0) {
    return (
      <Shell>
        <div className="text-4xl mb-3 opacity-30">🛋</div>
        <h2 className="text-lg font-semibold text-brand-charcoal mb-2">No sectionals available right now</h2>
        <p className="text-sm text-brand-charcoal-light mb-4">Give us a call to ask about custom orders.</p>
        <a href="tel:+12052385076" className="btn-brand inline-block">Call (205) 238-5076</a>
      </Shell>
    );
  }

  // STEP: pick-family
  if (step === 'pick-family') {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Build your sectional</h2>
        <p className="text-sm text-brand-charcoal-light mb-6">Pick a collection to start.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map((f) => (
            <button
              key={f.family}
              type="button"
              onClick={() => selectFamily(f.family)}
              className="text-left rounded-xl border border-brand-border overflow-hidden hover:border-brand-yellow hover:shadow-md transition-all"
            >
              <div className="aspect-[4/3] bg-brand-warm-gray flex items-center justify-center overflow-hidden">
                {f.sample_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.sample_image} alt={f.family} className="w-full h-full object-contain p-2" />
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

  // A family is selected but detail is still loading / errored.
  if (detailLoading || (!detail && !detailError)) {
    return <Shell><p className="text-brand-charcoal-light">Loading the {family} collection…</p></Shell>;
  }
  if (detailError || !detail) {
    return (
      <Shell tone="error">
        <p className="text-red-700 mb-3">{detailError}</p>
        <button type="button" onClick={() => { setFamily(''); setStep('pick-family'); }} className="btn-outline text-sm px-4 py-2">
          ← Back to collections
        </button>
      </Shell>
    );
  }

  // STEP: pick-color
  if (step === 'pick-color') {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-2xl mx-auto">
        <Breadcrumb family={family} color={null} onBack={() => { setFamily(''); setStep('pick-family'); }} showBack={!seedFamily} />
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Choose your color</h2>
        <p className="text-sm text-brand-charcoal-light mb-6">
          The <strong>{family}</strong> collection comes in {detail.colors.length} colors.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {detail.colors.map((c) => (
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

  // STEP: pick-pieces
  if (step === 'pick-pieces') {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-3xl mx-auto">
        <Breadcrumb
          family={family}
          color={color}
          onBack={() => { if (detail.colors.length > 1) setStep('pick-color'); else if (!seedFamily) { setFamily(''); setStep('pick-family'); } }}
          showBack={!seedFamily || detail.colors.length > 1}
        />

        {/* Merchandising — the full sectional, not just piece cutouts */}
        {detail.images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
            {detail.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${family} sectional`}
                className="shrink-0 h-40 sm:h-48 w-auto rounded-lg border border-brand-border bg-brand-warm-gray object-contain p-1"
              />
            ))}
          </div>
        )}

        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Pick your pieces</h2>
        <p className="text-sm text-brand-charcoal-light mb-6">
          These are the pieces the <strong>{family}</strong>{color && <> in <strong>{color}</strong></>} collection is built from. Tap + to add the exact pieces you need.
        </p>

        <div className="space-y-6 mb-6">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">{group}</h3>
              <div className="space-y-2">
                {items.map(({ piece_type, meta, product }) => {
                  const qty = counts[piece_type] || 0;
                  return (
                    <div
                      key={piece_type}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${qty > 0 ? 'border-brand-yellow bg-brand-yellow-light' : 'border-brand-border'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {product.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={meta.label}
                            className="shrink-0 w-14 h-14 rounded-md object-contain bg-brand-warm-gray border border-brand-border p-0.5"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-charcoal">{meta.label}</p>
                          {meta.hint && <p className="text-xs text-brand-charcoal-light mt-0.5">{meta.hint}</p>}
                          <p className="text-xs font-semibold text-brand-charcoal mt-0.5">${product.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button type="button" onClick={() => decrement(piece_type)} disabled={qty === 0} aria-label={`Remove one ${meta.label}`}
                          className="w-8 h-8 rounded-full border border-brand-border text-brand-charcoal hover:border-brand-yellow-dark disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none">−</button>
                        <span className="w-6 text-center font-semibold text-brand-charcoal">{qty}</span>
                        <button type="button" onClick={() => increment(piece_type)} aria-label={`Add one ${meta.label}`}
                          className="w-8 h-8 rounded-full border border-brand-border text-brand-charcoal hover:border-brand-yellow-dark text-lg leading-none">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Visualize — the canvas + list share one configuration. Arrange the
            pieces to see the real overall footprint. */}
        <div className="mt-8 pt-6 border-t border-brand-border">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-brand-charcoal">Visualize your layout</h3>
            <p className="text-xs text-brand-charcoal-light">
              Your picks appear here automatically — drag to arrange them into your room’s shape, or add pieces right on the grid.
              Turn on <strong>Dimensions</strong> to see the real overall size.
            </p>
          </div>
          <SectionalCanvas
            placed={placed}
            onChange={setPlaced}
            allowedTypes={allowedTypes}
            dimsByType={dimsByType}
            showDims={showDims}
            onToggleDims={() => setShowDims((s) => !s)}
          />
        </div>

        <div className="flex items-center justify-between pt-5 mt-6 border-t border-brand-border">
          <div className="text-sm text-brand-charcoal-light">
            <p>{totalPieces} piece{totalPieces === 1 ? '' : 's'} · <span className="font-semibold text-brand-charcoal">${total.toFixed(2)}</span></p>
            {dimsLoaded && footprintLabel && (
              <p className="text-xs text-brand-green font-semibold mt-0.5">Overall {footprintLabel}{footprint.complete ? '' : ' (approx.)'}</p>
            )}
          </div>
          <button type="button" onClick={() => setStep('review')} disabled={totalPieces === 0} className="btn-brand px-6 py-3 disabled:opacity-50">
            Review configuration
          </button>
        </div>
      </div>
    );
  }

  // STEP: review
  if (step === 'review') {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 max-w-3xl mx-auto">
        <Breadcrumb family={family} color={color} onBack={() => setStep('pick-pieces')} showBack />
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Review your sectional</h2>
        <p className="text-sm text-brand-charcoal-light mb-6">Here’s what we’re adding to your cart — every piece is a real in-stock SKU.</p>

        <div className="rounded-lg border border-brand-border divide-y divide-brand-border mb-4">
          {resolved.map((r) => (
            <div key={r.piece_type} className="flex items-start justify-between gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-charcoal">
                  {r.meta.label} <span className="text-brand-charcoal-light font-normal">× {r.qty}</span>
                </p>
                <p className="text-xs text-brand-charcoal-light mt-1 truncate">{r.product.name} <span className="font-mono">· {r.product.sku}</span></p>
              </div>
              <p className="text-sm font-semibold text-brand-charcoal flex-shrink-0">${(r.product.price * r.qty).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between bg-brand-warm-gray rounded-lg px-4 py-3 mb-5">
          <div>
            <p className="text-sm text-brand-charcoal-light">Total ({totalPieces} {totalPieces === 1 ? 'piece' : 'pieces'})</p>
            {dimsLoaded && footprintLabel && (
              <p className="text-xs text-brand-green font-semibold mt-0.5">Overall footprint {footprintLabel}{footprint.complete ? '' : ' (approx.)'}</p>
            )}
          </div>
          <p className="text-xl font-bold text-brand-charcoal">${total.toFixed(2)}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => setStep('pick-pieces')} className="btn-outline flex-1 py-3">Back to pieces</button>
          <button type="button" onClick={addToCart} disabled={resolved.length === 0} className="btn-brand flex-1 py-3 disabled:opacity-50">
            Add {totalPieces} piece{totalPieces === 1 ? '' : 's'} to cart
          </button>
        </div>
      </div>
    );
  }

  // STEP: done
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-8 text-center max-w-2xl mx-auto">
      <div className="w-14 h-14 mx-auto rounded-full bg-brand-green-light flex items-center justify-center text-brand-green mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Sectional added to your cart</h2>
      <p className="text-sm text-brand-charcoal-light mb-6">
        Your <strong>{family}</strong>{color && <> in <strong>{color}</strong></>} configuration is ready to check out.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/cart" className="btn-brand px-6 py-3">Go to cart</Link>
        <button type="button" onClick={resetForNewBuild} className="btn-outline px-6 py-3">Build another</button>
      </div>
    </div>
  );
}

function Shell({ children, tone }: { children: ReactNode; tone?: 'error' }) {
  return (
    <div className={`bg-white rounded-2xl border p-8 text-center max-w-2xl mx-auto ${tone === 'error' ? 'border-red-200' : 'border-brand-border'}`}>
      {children}
    </div>
  );
}

function Breadcrumb({ family, color, onBack, showBack }: { family: string; color: string | null; onBack: () => void; showBack: boolean }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2 text-sm text-brand-charcoal-light">
        <span className="font-semibold text-brand-charcoal">{family}</span>
        {color && (<><span>·</span><span className="font-semibold text-brand-charcoal">{color}</span></>)}
      </div>
      {showBack && (
        <button type="button" onClick={onBack} className="text-xs text-brand-charcoal-light hover:text-brand-charcoal underline">← Change</button>
      )}
    </div>
  );
}
