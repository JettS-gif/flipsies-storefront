import { api } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import AddToCartButton from '@/components/AddToCartButton';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await api.getProduct(id);
    const name = [product.collection, product.color].filter(Boolean).join(' — ') || product.name;
    return {
      title: name,
      description: `${name} — $${Number(product.retail_price).toFixed(2)} at Flipsies Furniture. ${product.description || ''}`.trim(),
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  let product;
  try {
    product = await api.getProduct(id);
  } catch {
    notFound();
  }

  const p = product;
  const displayName = [p.collection, p.color].filter(Boolean).join(' — ') || p.name;
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.retail_price;
  const savings = hasDiscount ? (p.compare_at_price! - p.retail_price).toFixed(2) : null;
  const inStock = p.qty_on_hand > 0;

  const details = [
    p.type && { label: 'Type', value: p.type },
    p.category && { label: 'Category', value: p.category },
    p.room && { label: 'Room', value: p.room },
    p.material && { label: 'Material', value: p.material },
    p.material_class && { label: 'Material Class', value: p.material_class },
    p.dimensions && { label: 'Dimensions', value: p.dimensions },
    p.vendor?.name && { label: 'Brand', value: p.vendor.name },
    p.sku && { label: 'SKU', value: p.sku },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-8">
        <Link href="/shop" className="hover:text-brand-charcoal transition-colors">Shop</Link>
        {p.category && (
          <>
            <span>/</span>
            <Link href={`/shop/${encodeURIComponent(p.category)}`} className="hover:text-brand-charcoal transition-colors">
              {p.category}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-brand-charcoal font-medium truncate max-w-[200px]">{displayName}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Image */}
        <div className="aspect-square bg-brand-warm-gray rounded-2xl flex items-center justify-center overflow-hidden">
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="text-7xl mb-4 opacity-20">🛋</div>
              <p className="text-sm text-brand-charcoal-light opacity-40">Image coming soon</p>
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          {p.vendor?.name && (
            <div className="text-xs font-mono text-brand-charcoal-light uppercase tracking-widest mb-2">
              {p.vendor.name}
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-brand-charcoal leading-tight">
            {displayName}
          </h1>

          {p.sectional_piece_type && (
            <span className="inline-block mt-2 text-xs bg-brand-green-light text-brand-green px-3 py-1 rounded-full font-medium">
              Sectional — {p.sectional_piece_type}
            </span>
          )}

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-brand-charcoal">
              ${Number(p.retail_price).toFixed(2)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-red-400 line-through">
                  ${Number(p.compare_at_price).toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  Save ${savings}
                </span>
              </>
            )}
          </div>

          {/* Availability */}
          <div className="mt-4">
            {inStock ? (
              <span className="text-sm text-brand-green font-medium">In Stock — Ready for delivery</span>
            ) : (
              <span className="text-sm text-brand-yellow-dark font-medium">Special Order — Ask about lead time</span>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <AddToCartButton product={{
              id: p.id,
              sku: p.sku,
              name: p.name,
              collection: p.collection,
              color: p.color,
              retail_price: p.retail_price,
              image_url: p.image_url,
              category: p.category,
            }} />
            <Link href="/locations" className="btn-outline text-base px-8 py-3 text-center">
              Visit Showroom
            </Link>
          </div>

          {/* Description */}
          {p.description && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-3">Description</h2>
              <p className="text-sm text-brand-charcoal-light leading-relaxed">{p.description}</p>
            </div>
          )}

          {/* Details table */}
          {details.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-3">Details</h2>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                {details.map((d, i) => (
                  <div key={d.label} className={`flex text-sm ${i > 0 ? 'border-t border-brand-border' : ''}`}>
                    <span className="w-32 sm:w-40 shrink-0 px-4 py-3 bg-brand-warm-gray text-brand-charcoal-light font-medium">
                      {d.label}
                    </span>
                    <span className="px-4 py-3 text-brand-charcoal">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financing note */}
          <div className="mt-8 bg-brand-warm-gray rounded-lg p-4">
            <p className="text-sm text-brand-charcoal-light">
              <span className="font-semibold text-brand-charcoal">Financing available</span> — Synchrony, Progressive Leasing, and 1st Franklin options.
              <Link href="/financing" className="text-brand-yellow-dark hover:underline ml-1">Learn more</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
