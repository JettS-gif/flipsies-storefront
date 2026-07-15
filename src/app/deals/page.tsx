import Link from 'next/link';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Deals',
  description: 'Current sale items and promotional pricing at Flipsies Furniture.',
  path: '/deals',
});

// On-sale products — anything with compare_at_price > retail_price. The
// catalog endpoint doesn't expose a sale filter today, so we pull a
// generous page and filter client-side. Sale inventory turns over fast;
// keep this list short rather than padding it.
export default async function DealsPage() {
  let deals: Awaited<ReturnType<typeof api.getProducts>>['data'] = [];
  try {
    const res = await api.getProducts({ limit: 96 });
    deals = res.data.filter(
      p => p.compare_at_price && Number(p.compare_at_price) > Number(p.retail_price),
    );
  } catch {
    // Catalog fetch failed — show the empty state below instead of crashing
    // the page. Users can still reach /shop directly from the nav.
    deals = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Deals</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-lg mx-auto">
          Floor-model sale items, end-of-season clearance, and special
          pricing from our vendors. Stock changes weekly.
        </p>
      </header>

      {deals.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {deals.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="text-center bg-brand-warm-gray rounded-2xl p-10 max-w-2xl mx-auto">
          <div className="text-4xl mb-4">🏷️</div>
          <h2 className="text-xl font-semibold text-brand-charcoal mb-2">
            No active deals at the moment
          </h2>
          <p className="text-sm text-brand-charcoal-light mb-6">
            Our sale picks rotate seasonally. New deals usually land at
            the start of each month, plus floor-model clearance on
            display pieces we&apos;re refreshing.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/shop" className="btn-brand text-sm">Browse the Catalog</Link>
            <Link href="/locations" className="btn-outline text-sm">Visit a Showroom</Link>
          </div>
        </div>
      )}
    </div>
  );
}
