import Link from 'next/link';
import type { Product } from '@/lib/api';
import ProductCardImage from '@/components/ProductCardImage';

export default function ProductCard({ product }: { product: Product }) {
  const p = product;
  const displayName = [p.collection, p.color].filter(Boolean).join(' — ') || p.name;
  const subtitle = [p.type, p.category].filter(Boolean).join(' · ');
  // No `compare_at_price` strikethrough anywhere online (Jett, 2026-08-05).
  // A struck-through anchor is Hi-Lo "was/now" framing, which contradicts the
  // everyday-low-price position the homepage leads with — and it was on a third
  // of the catalog. The column is NOT going away: printed floor tags still show
  // it, and those render from DeliverDeskFrontEnd (printTagsCore.js /
  // bulkPrintTags.js / inventoryTagPrices.js), a different codebase entirely.
  const inStock = p.in_stock;
  // Vendor-exited sell-through: genuine liquidation of remaining stock, not a
  // Hi-Lo "sale" (EDLP intact). It's not reorderable, so never show it as a
  // "Special Order" — the units on hand are all there is.
  const clearance = !!p.clearance;
  // The browse grid collapses a variant group to one tile, so without this the
  // shopper can't tell a model comes in nine colourways until they open it.
  const colorways = p.variant_count ?? 1;
  // Fabric-graded frames (Chairs America, Southern Motion) are stocked in a few
  // colourways but orderable in the whole fabric library. When that library is
  // bigger than what we stock, show the honest split instead of a bare count.
  const orderable = p.orderable_count ?? 0;
  const showFabricSplit = orderable > colorways;

  return (
    <Link
      href={`/product/${p.id}`}
      className="group block bg-white rounded-xl border border-brand-border overflow-hidden
        hover:shadow-lg hover:border-brand-yellow transition-all duration-200"
    >
      {/* Image placeholder. Using a 4:3 container because most furniture
          is photographed in landscape — forcing aspect-square was cropping
          the sides off couches, beds, and dining tables. 4:3 gives cards
          a uniform height while preserving more of the product. */}
      <div className="aspect-[4/3] bg-brand-warm-gray flex items-center justify-center relative overflow-hidden">
        {p.image_url ? (
          // Adaptive fill: photos close to the card's 4:3 shape fill it
          // edge-to-edge; mis-shaped ones stay letterboxed rather than being
          // cropped. See lib/imageFit.ts.
          <ProductCardImage src={p.image_url} alt={displayName} />
        ) : (
          <div className="text-center p-4">
            <div className="text-4xl mb-2 opacity-20">
              {p.category?.toLowerCase().includes('bed') ? '🛏' :
               p.category?.toLowerCase().includes('mattress') ? '💤' :
               p.category?.toLowerCase().includes('table') || p.category?.toLowerCase().includes('dining') ? '🍽' :
               p.category?.toLowerCase().includes('desk') || p.category?.toLowerCase().includes('office') ? '💼' :
               p.category?.toLowerCase().includes('lamp') || p.category?.toLowerCase().includes('light') ? '💡' :
               p.category?.toLowerCase().includes('rug') ? '🟫' :
               p.category?.toLowerCase().includes('recliner') ? '💺' :
               '🛋'}
            </div>
            <div className="text-xs text-brand-charcoal-light opacity-40 font-mono">{p.sku}</div>
          </div>
        )}
        {/* Badges — no SALE badge (EDLP: no Hi-Lo sale framing). Clearance is a
            lifecycle fact (final units of an exited line), not a promo. */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {clearance && (
            <span className="bg-brand-charcoal text-brand-yellow text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              CLEARANCE · FINAL UNITS
            </span>
          )}
          {p.sectional_piece_type && (
            <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              SECTIONAL
            </span>
          )}
        </div>
        {/* Top-right stack — "Special Order" already lives here, so the colour
            badge stacks under it rather than overlapping when both apply. */}
        {(colorways > 1 || showFabricSplit || (!inStock && !clearance)) && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {!inStock && !clearance && (
              <span className="bg-brand-charcoal text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                Special Order
              </span>
            )}
            {showFabricSplit ? (
              <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                {colorways} in stock · {orderable} orderable
              </span>
            ) : colorways > 1 ? (
              <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                Available in {colorways} Colors!
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {p.vendor?.name && (
          <div className="text-[10px] font-mono text-brand-charcoal-light uppercase tracking-wider mb-1">
            {p.vendor.name}
          </div>
        )}
        <h3 className="text-sm font-semibold text-brand-charcoal leading-snug line-clamp-2 group-hover:text-brand-yellow-dark transition-colors">
          {displayName}
        </h3>
        {subtitle && (
          <p className="text-xs text-brand-charcoal-light mt-1">{subtitle}</p>
        )}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand-charcoal">
            ${Number(p.retail_price).toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  );
}
