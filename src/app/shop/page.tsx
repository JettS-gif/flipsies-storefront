import { api } from '@/lib/api';
import type { Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import SectionalFamilyCards from '@/components/SectionalFamilyCards';
import ShopFilters from '@/components/ShopFilters';
import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import { fetchSectionalFamilies, type SectionalFamily } from '@/lib/sectional';
import { fetchFacets } from '@/lib/facets';
import { fetchPackages, type StorefrontPackage } from '@/lib/packages';
import PackageCards from '@/components/PackageCards';
import { SORTS, buildHref, activeFilterCount, type ShopSearchParams } from '@/lib/shopFilters';

// `path` is hardcoded, so every filtered view (/shop?color_family=Grey&…)
// canonicals back to /shop. That's the point: faceted URLs multiply into
// thousands of near-duplicates and would otherwise dilute the page we pay to
// rank. Do not make this dynamic.
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
  searchParams: Promise<ShopSearchParams>;
}

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { search } = sp;
  const nActive = activeFilterCount(sp);

  let products: Product[] = [];
  let categories: string[] = [];
  let families: SectionalFamily[] = [];
  let packages: StorefrontPackage[] = [];
  let facets = null;
  let count = 0;

  try {
    const params: Record<string, string | number> = { limit: 48, exclude_sectionals: 1 };
    if (search) params.search = search;
    // Pass filters straight through — the endpoint owns the semantics (colour
    // forces the base table, availability reads the generated qty, etc).
    for (const k of ['room', 'brand', 'collection', 'color_family', 'price_min', 'price_max', 'availability', 'sort'] as const) {
      if (sp[k]) params[k] = sp[k]!;
    }
    const [prodRes, catRes, famList, pkgList, facetRes] = await Promise.all([
      api.getProducts(params),
      api.getCategories(),
      fetchSectionalFamilies().catch(() => []),
      // Packages are merchandising, not a filtered result set — a shopper who
      // narrowed to "grey, under $500" is shopping pieces, so the set cards are
      // hidden below rather than fetched and filtered. Same call the sectional
      // family cards make.
      fetchPackages({ search, collection: sp.collection, room: sp.room }).catch(() => []),
      fetchFacets(),
    ]);
    products = prodRes.data || [];
    count = prodRes.count || 0;
    categories = catRes.categories || [];
    families = famList || [];
    packages = pkgList || [];
    facets = facetRes;
  } catch (e) {
    console.error('Failed to load products:', e);
  }

  // When searching, only surface the family cards that match the query. When a
  // retail filter is on, hide them entirely: the cards are built from the
  // sectional families endpoint, which knows nothing about price/brand/colour —
  // leaving them up would contradict the filter the shopper just set.
  const shownFamilies = nActive > 0
    ? []
    : search
      ? families.filter(
          (f) =>
            f.family.toLowerCase().includes(search.toLowerCase()) ||
            f.colors.some((c) => c.toLowerCase().includes(search.toLowerCase())),
        )
      : families;

  // Set cards hide the moment the shopper filters — including via a package's
  // own "Akerson — shop pieces" badge, which sets ?collection=. That's the
  // drill-in working as intended: the badge trades the set card for the pieces.
  // An intent-driven query ("chest") must never be answered with a set tile.
  const shownPackages = nActive > 0 ? [] : packages;
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
        {/* Left rail — filters FIRST, then categories.
            Order matters: there are 125 distinct categories, and listing them
            all above the filters buried the filters ~2000px down the page, well
            past where anyone scrolls. Filters are the primary retail control;
            the category long tail is a nav aid. The category list is capped and
            scrolls inside itself for the same reason. */}
        <aside className="hidden lg:block w-56 shrink-0">
          {/* Filters stay available while searching — narrowing a result set is
              exactly when they earn their keep. */}
          {facets && <ShopFilters facets={facets} sp={sp} />}
          {!search && (
            <nav className="space-y-1 mt-6 border-t border-brand-border pt-4">
              <h2 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">Categories</h2>
              <div className="max-h-72 overflow-y-auto pr-1 -mr-1">
                <Link
                  href="/shop"
                  className="block px-2 py-1.5 text-sm font-medium text-brand-charcoal bg-brand-warm-gray rounded-md"
                >
                  All Products
                </Link>
                {categories.map(cat => {
                  const mapped = CATEGORY_MAP[cat];
                  return (
                    <Link
                      key={cat}
                      href={catHref(cat)}
                      className="block px-2 py-1.5 text-sm text-brand-charcoal-light hover:text-brand-charcoal
                        hover:bg-brand-warm-gray rounded-md transition-colors"
                    >
                      {mapped?.icon || '📦'} {mapped?.label || cat}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {/* Sort — Links, not a <select>, so the whole rail stays server-rendered
              and each sort is a real shareable URL. */}
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="text-sm text-brand-charcoal-light">
              {nActive > 0 && (
                <span>
                  {count} match{count !== 1 ? 'es' : ''} ·{' '}
                  <Link href={buildHref({ search }, {})} className="text-brand-yellow-dark hover:underline">
                    Clear filters
                  </Link>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-brand-charcoal-light mr-1">Sort</span>
              {SORTS.map(s => {
                const active = (sp.sort ?? '') === s.value;
                return (
                  <Link
                    key={s.value || 'featured'}
                    href={buildHref(sp, { sort: s.value || null })}
                    aria-current={active ? 'true' : undefined}
                    className={`px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                      active
                        ? 'border-brand-yellow bg-brand-yellow/10 text-brand-charcoal font-semibold'
                        : 'border-brand-border text-brand-charcoal-light hover:border-brand-charcoal-light'
                    }`}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile filters — the rail is desktop-only, so surface the active
              state and a way out rather than stranding phone shoppers. */}
          {facets && (
            <details className="lg:hidden mb-4 border border-brand-border rounded-lg">
              <summary className="px-4 py-2.5 text-sm font-semibold text-brand-charcoal cursor-pointer">
                Filter{nActive > 0 ? ` (${nActive})` : ''}
              </summary>
              <div className="px-4 pb-4">
                <ShopFilters facets={facets} sp={sp} />
              </div>
            </details>
          )}

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

          {/* Bundles as set cards, not five near-identical piece tiles */}
          <PackageCards packages={shownPackages} />

          {/* Sectionals as family cards (built via the wizard), not piece tiles */}
          <SectionalFamilyCards families={shownFamilies} />

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : shownFamilies.length === 0 && shownPackages.length === 0 ? (
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
