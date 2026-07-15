import { api } from '@/lib/api';
import type { Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import SectionalFamilyCards from '@/components/SectionalFamilyCards';
import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import { fetchSectionalFamilies, type SectionalFamily } from '@/lib/sectional';

export const metadata = pageMetadata({
  title: 'Shop All Furniture',
  description: 'Browse our full collection of sofas, sectionals, bedroom sets, dining furniture, and more at Flipsies Furniture.',
  path: '/shop',
});

const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
  'Sofa':           { label: 'Sofas', icon: '🛋' },
  // Single canonical sectional category after migrations/consolidate_sectional_categories.sql
  // collapsed the legacy "Sectional Piece" and "Sectional Part" buckets into "Sectional".
  'Sectional':      { label: 'Sectionals', icon: '🔲' },
  'Loveseat':       { label: 'Loveseats', icon: '🛋' },
  'Recliner':       { label: 'Recliners', icon: '💺' },
  'Chair':          { label: 'Chairs', icon: '🪑' },
  'Ottoman':        { label: 'Ottomans', icon: '🟫' },
  'Table':          { label: 'Tables', icon: '🍽' },
  'Bed':            { label: 'Beds', icon: '🛏' },
  'Dresser':        { label: 'Dressers', icon: '🗄' },
  'Nightstand':     { label: 'Nightstands', icon: '🛏' },
  'Mattress':       { label: 'Mattresses', icon: '💤' },
  'Desk':           { label: 'Desks', icon: '💼' },
  'Lamp':           { label: 'Lamps', icon: '💡' },
};

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function ShopPage({ searchParams }: Props) {
  const { search } = await searchParams;

  let products: Product[] = [];
  let categories: string[] = [];
  let families: SectionalFamily[] = [];
  let count = 0;

  try {
    const params: Record<string, string | number> = { limit: 48, exclude_sectionals: 1 };
    if (search) params.search = search;
    const [prodRes, catRes, famList] = await Promise.all([
      api.getProducts(params),
      api.getCategories(),
      fetchSectionalFamilies().catch(() => []),
    ]);
    products = prodRes.data || [];
    count = prodRes.count || 0;
    categories = catRes.categories || [];
    families = famList || [];
  } catch (e) {
    console.error('Failed to load products:', e);
  }

  // When searching, only surface the family cards that match the query.
  const shownFamilies = search
    ? families.filter(
        (f) =>
          f.family.toLowerCase().includes(search.toLowerCase()) ||
          f.colors.some((c) => c.toLowerCase().includes(search.toLowerCase())),
      )
    : families;
  const catHref = (c: string) => (c === 'Sectional' ? '/sectionals' : `/shop/${encodeURIComponent(c)}`);

  const title = search ? `Results for "${search}"` : 'Shop All';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-charcoal">{title}</h1>
        <p className="text-brand-charcoal-light mt-1">
          {count} product{count !== 1 ? 's' : ''}{search ? ' found' : ' available'}
        </p>
        {search && (
          <Link href="/shop" className="text-sm text-brand-yellow-dark hover:underline mt-2 inline-block">
            Clear search
          </Link>
        )}
      </div>

      <div className="flex gap-8">
        {/* Sidebar — categories */}
        {!search && (
          <aside className="hidden lg:block w-56 shrink-0">
            <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-4">Categories</h2>
            <nav className="space-y-1">
              <Link
                href="/shop"
                className="block px-3 py-2 text-sm font-medium text-brand-charcoal bg-brand-warm-gray rounded-lg"
              >
                All Products
              </Link>
              {categories.map(cat => {
                const mapped = CATEGORY_MAP[cat];
                return (
                  <Link
                    key={cat}
                    href={catHref(cat)}
                    className="block px-3 py-2 text-sm text-brand-charcoal-light hover:text-brand-charcoal
                      hover:bg-brand-warm-gray rounded-lg transition-colors"
                  >
                    {mapped?.icon || '📦'} {mapped?.label || cat}
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Product grid */}
        <div className="flex-1">
          {/* Mobile category pills */}
          {!search && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 -mx-1 px-1">
              <Link href="/shop"
                className="shrink-0 px-4 py-2 rounded-full text-xs font-medium bg-brand-charcoal text-white">
                All
              </Link>
              {categories.slice(0, 8).map(cat => (
                <Link key={cat} href={`/shop/${encodeURIComponent(cat)}`}
                  className="shrink-0 px-4 py-2 rounded-full text-xs font-medium border border-brand-border
                    text-brand-charcoal-light hover:border-brand-yellow transition-colors whitespace-nowrap">
                  {CATEGORY_MAP[cat]?.label || cat}
                </Link>
              ))}
            </div>
          )}

          {/* Sectionals as family cards (built via the wizard), not piece tiles */}
          <SectionalFamilyCards families={shownFamilies} />

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : shownFamilies.length === 0 ? (
            <div className="text-center py-20 text-brand-charcoal-light">
              <div className="text-4xl mb-4">📦</div>
              <p>{search ? `No products match "${search}".` : 'No products found. Check back soon!'}</p>
              {search && (
                <Link href="/shop" className="text-brand-yellow-dark hover:underline mt-2 inline-block">
                  Browse all products
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
