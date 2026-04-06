import Link from 'next/link';
import type { Product } from '@/lib/api';

export default function ProductCard({ product }: { product: Product }) {
  const p = product;
  const displayName = [p.collection, p.color].filter(Boolean).join(' — ') || p.name;
  const subtitle = [p.type, p.category].filter(Boolean).join(' · ');
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.retail_price;
  const inStock = p.qty_on_hand > 0;

  return (
    <Link
      href={`/product/${p.id}`}
      className="group block bg-white rounded-xl border border-brand-border overflow-hidden
        hover:shadow-lg hover:border-brand-yellow transition-all duration-200"
    >
      {/* Image placeholder */}
      <div className="aspect-square bg-brand-warm-gray flex items-center justify-center relative overflow-hidden">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-center p-4">
            <div className="text-4xl mb-2 opacity-30">🛋</div>
            <div className="text-xs text-brand-charcoal-light opacity-50 font-mono">{p.sku}</div>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              SALE
            </span>
          )}
          {p.sectional_piece_type && (
            <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              SECTIONAL
            </span>
          )}
        </div>
        {!inStock && (
          <div className="absolute top-2 right-2">
            <span className="bg-brand-charcoal text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              Special Order
            </span>
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
          {hasDiscount && (
            <span className="text-sm text-red-400 line-through">
              ${Number(p.compare_at_price).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
