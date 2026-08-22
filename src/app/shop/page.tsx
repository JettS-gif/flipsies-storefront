import { api } from '@/lib/api';
import type { Product, SearchSuggestion } from '@/lib/api';
import { THIN_RESULT_MAX } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import SectionalFamilyCards from '@/components/SectionalFamilyCards';
import ShopFilters from '@/components/ShopFilters';
import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import { fetchSectionalFamilies, type SectionalFamily } from '@/lib/sectional';
import { fetchFacets } from '@/lib/facets';
import { fetchPackages, type StorefrontPackage } from '@/lib/packages';
import PackageCards from '@/components/PackageCards';
import CollectionCards, { type CollectionCard } from '@/components/CollectionCards';
import { buildCollectionCards, normColl } from '@/lib/collectionCards';
import TrackEvent from '@/components/TrackEvent';
import { SORTS, buildHref, activeFilterCount, PAGE_SIZE, pageOf, pageCount, type ShopSearchParams } from '@/lib/shopFilters';
import Pagination from '@/components/Pagination';
import type { Metadata } from 'next';

// Every FILTERED view (/shop?color_family=Grey&…) still canonicals back to
// /shop. That's the point: faceted URLs multiply into thousands of
// near-duplicates and would otherwise dilute the page we pay to rank. Do not
// make the canonical reflect the filters.
//
// The page number is the one exception, and it is not a facet: /shop?page=3
// holds 48 products that appear nowhere else, so canonicalising it to /shop
// would declare them duplicates of a page they are absent from. It therefore
// self-canonicals, and every other param is still discarded.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const page = pageOf(sp);
  // A FILTERED view is noindex/nofollow (2026-08-22). The canonical above
  // already stopped facets diluting rankings; what it could not do is stop a
  // crawler fetching every combination to find that canonical. Nine filter
  // dimensions multiply into millions of URLs and meta-externalagent walked
  // them — 2.2M hits on /shop in 12 hours against a ~3,100-URL catalogue.
  // Pagination is deliberately still indexable: ?page=3 holds 48 products that
  // appear nowhere else, so it is real content, not a near-duplicate.
  const filtered = activeFilterCount(sp) > 0;
  return pageMetadata({
    title: page > 1 ? `Shop All Furniture — Page ${page}` : 'Shop All Furniture',
    description: 'Browse our full collection of sofas, sectionals, bedroom sets, dining furniture, and more at Flipsies Furniture.',
    path: page > 1 ? `/shop?page=${page}` : '/shop',
    noindex: filtered,
  });
}

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
  const page = pageOf(sp);
  const nActive = activeFilterCount(sp);
  // Room browse (e.g. ?room=Bedroom) is a "show me the collections" intent, not a
  // piece-level query — so it KEEPS the collapsed set cards instead of hiding
  // them. Search, an explicit ?collection= drill-in, and a colour-intent query
  // still escape to the flat piece grid below.
  const roomBrowse = !!sp.room && !search && !sp.collection && !sp.color_family;

  let products: Product[] = [];
  let categories: string[] = [];
  let families: SectionalFamily[] = [];
  let packages: StorefrontPackage[] = [];
  let facets = null;
  let count = 0;

  // Room browse groups by collection client-side, so fetch enough to cover a
  // whole room's pieces before the packaged ones are suppressed (no paging yet).
  // Declared outside the try so the did-you-mean pass below can re-run the same
  // query under a different term without rebuilding the shopper's filters.
  // Room browse fetches the whole room because it collapses to one card per
  // collection; every other view is a flat product list and pages 48 at a time.
  const params: Record<string, string | number> = roomBrowse
    ? { limit: 1000, exclude_sectionals: 1 }
    : { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, exclude_sectionals: 1 };
  if (search) params.search = search;
  // Pass filters straight through — the endpoint owns the semantics (colour
  // forces the base table, availability reads the generated qty, etc).
  for (const k of ['room', 'brand', 'collection', 'color_family', 'price_min', 'price_max', 'availability', 'sort'] as const) {
    if (sp[k]) params[k] = sp[k]!;
  }

  // EVERY promise carries its own fallback. Promise.all is all-or-nothing, so a
  // sibling failure used to take the whole page's data with it — and worse, when
  // MORE THAN ONE rejected, only the first reached the catch below. The rest
  // were unobserved and surfaced as unhandled rejections.
  //
  // That is not hypothetical: 2026-08-20 08:16 CDT (Sentry FLIPSIES-STOREFRONT-1),
  // during the Postgres saturation, /storefront/facets and /storefront/categories
  // both returned 500. Two rejections — one caught, one unhandled — and the shop
  // page rendered with NO PRODUCTS even though the products call itself was fine.
  //
  // Facets and categories are page CHROME. A shopper can still browse a grid
  // without a filter rail; they cannot browse an empty one. Degrading each
  // dataset independently is what keeps the storefront useful through a backend
  // blip instead of blank.
  try {
    const [prodRes, catRes, famList, pkgList, facetRes] = await Promise.all([
      // Deliberately the ONLY one without a fallback: there is no useful shop
      // page without products, so this failure should reach the catch below and
      // be logged as a real one. With every sibling now guarded it is also the
      // only promise that can reject, which is what makes an unobserved
      // rejection impossible here.
      api.getProducts(params),
      api.getCategories().catch(() => ({ categories: [] as string[] })),
      fetchSectionalFamilies().catch(() => []),
      // Packages are merchandising, not a filtered result set — a shopper who
      // narrowed to "grey, under $500" is shopping pieces, so the set cards are
      // hidden below rather than fetched and filtered. Same call the sectional
      // family cards make.
      fetchPackages({ search, collection: sp.collection, room: sp.room }).catch(() => []),
      fetchFacets().catch(() => null),
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
  // Extracted so the did-you-mean pass can re-match on the substituted term.
  // Sectionals are excluded from the product grid and surface ONLY as these
  // cards, so a "corner couch" → "sectional" correction that skipped this would
  // hand back an empty page while holding the right answer.
  const matchFamilies = (term: string) =>
    families.filter(
      (f) =>
        f.family.toLowerCase().includes(term.toLowerCase()) ||
        f.colors.some((c) => c.toLowerCase().includes(term.toLowerCase())),
    );

  const shownFamilies = nActive > 0
    ? []
    : search
      ? matchFamilies(search)
      : families;

  // Set cards hide the moment the shopper filters — including via a package's
  // own "Akerson — shop pieces" badge, which sets ?collection=. That's the
  // drill-in working as intended: the badge trades the set card for the pieces.
  // An intent-driven query ("chest") must never be answered with a set tile.
  const shownPackages = (roomBrowse || nActive === 0) ? packages : [];

  // Room browse collapses to ONE card per collection — see lib/collectionCards.
  // Shared with /shop/<room-slug>, which is the canonical room URL we ask Google
  // to index; two implementations of "what is a room browse" would drift.
  const packagedCollections = new Set(shownPackages.map((p) => normColl(p.collection)).filter(Boolean));

  let collectionCards: CollectionCard[] = [];
  let shownProducts = products;
  if (roomBrowse) {
    const collapsed = buildCollectionCards(products, packagedCollections);
    collectionCards = collapsed.cards;
    shownProducts = collapsed.loose; // only uncollected pieces remain as individual tiles
  }
  // ── Did-you-mean ─────────────────────────────────────────────────────────
  // Runs ONLY on the dead end: the shopper searched and every surface came back
  // empty. The two extra round trips are unavoidably sequential — we cannot
  // know a correction is needed until the first result returns empty — and that
  // is affordable precisely here, because the alternative on this path is
  // showing someone a blank page.
  //
  // What we log does NOT change. TrackEvent below still records the shopper's
  // ORIGINAL words and the original zero count. That zero is the unmet-demand
  // signal the whole website panel is built on; rewriting it to look like a hit
  // would destroy the data that tells Jett what to stock. Substitution is a
  // display concern only, and the banner always tells the shopper we did it.
  let suggestion: SearchSuggestion | null = null;
  let suggested: {
    products: Product[];
    count: number;
    packages: StorefrontPackage[];
    families: SectionalFamily[];
  } | null = null;

  const foundNothing = !!search
    && shownProducts.length === 0
    && shownFamilies.length === 0
    && shownPackages.length === 0
    && collectionCards.length === 0;

  // THIN — the search worked, but barely. `count` is the server's total for the
  // shopper's own words, so this is "we answered, with almost nothing".
  //
  // Why this exists: the correction layer used to fire only at exactly zero, so
  // nine known vocabulary gaps never reached it. "sofa bed" returns three
  // `678 BEDFORD PARK` sofas — matching the token "bed" inside "BEDFORD" — while
  // 14 actual sleepers sit unshown, and 3 > 0 meant no banner and no correction.
  //
  // Deliberately NOT triggered when the shopper has narrowed with filters: three
  // results under four active facets is a working filter, not a failing search,
  // and appending a synonym's products would fight the narrowing they just did.
  const foundThin = !!search
    && !foundNothing
    && nActive === 0
    && count > 0
    && count <= THIN_RESULT_MAX;

  if (foundNothing || foundThin) {
    try {
      // The thin path asks for synonyms only — see suggestAlternatives. Their
      // spelling demonstrably worked, so the trigram speller has nothing to add
      // and plenty to get wrong on a rare collection or model name.
      suggestion = await api.getSearchSuggestion(search!, { thin: foundThin });
      if (suggestion.suggestion) {
        const term = suggestion.suggestion;
        const [prodRes, pkgList] = await Promise.all([
          api.getProducts({ ...params, search: term }),
          fetchPackages({ search: term, collection: sp.collection, room: sp.room }).catch(() => []),
        ]);
        const sFamilies = nActive > 0 ? [] : matchFamilies(term);
        // The suggestion's own count came from the UNFILTERED published catalog,
        // so it can promise results the shopper's active filters then remove
        // ("nightstand" under color_family=Grey). Only swap the view once the
        // re-run actually produced something under those same filters —
        // otherwise a banner would announce results that aren't there, which is
        // worse than the honest empty state.
        if ((prodRes.data?.length || 0) > 0 || pkgList.length > 0 || sFamilies.length > 0) {
          // APPEND on the thin path, REPLACE on the empty one. The shopper's own
          // hits are real products that matched their words — hiding them to show
          // a synonym's shelf would be a downgrade, and for some terms the hit is
          // not in the mapped set at all ("armoire" finds one Michael Amini piece
          // that is NOT among the 56 accent cabinets). Deduped by id so a product
          // matching both phrasings is not shown twice, and theirs stay first.
          const seen = new Set(shownProducts.map((p) => p.id));
          const extraProducts = (prodRes.data || []).filter((p) => !seen.has(p.id));
          const seenPkg = new Set(shownPackages.map((p) => p.id));
          const extraPackages = pkgList.filter((p) => !seenPkg.has(p.id));

          suggested = foundThin
            ? {
                products: [...shownProducts, ...extraProducts],
                // Their total plus what the synonym genuinely added. Using the
                // suggestion's own count would double-count the overlap and
                // print a number the grid does not contain.
                count: count + extraProducts.length,
                packages: [...shownPackages, ...extraPackages],
                families: shownFamilies.length ? shownFamilies : sFamilies,
              }
            : {
                products: prodRes.data || [],
                count: prodRes.count || 0,
                packages: pkgList,
                families: sFamilies,
              };
        }
      }
    } catch (e) {
      // A dead-end search must not also 500.
      console.error('Did-you-mean lookup failed:', e);
    }
  }

  // What the grid actually renders: the substituted set when we found a better
  // phrasing, otherwise the shopper's own (empty) result.
  const gridProducts = suggested ? suggested.products : shownProducts;
  const gridPackages = suggested ? suggested.packages : shownPackages;
  const gridFamilies = suggested ? suggested.families : shownFamilies;
  const gridCount    = suggested ? suggested.count    : count;

  const catHref = (c: string) => (c === 'Sectional' ? '/sectionals' : `/shop/${encodeURIComponent(c)}`);

  const title = search ? `Results for "${search}"` : 'Shop All';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* First-party search event. Fired ONLY when the shopper actually
          searched — a room/filter browse is not a search and would drown the
          real queries. `count` is the server's total match count, not the
          length of the paged slice, so a search that matched nothing records
          results_count = 0. That zero is the most valuable row in the whole
          system: it is a customer naming something we do not carry, or do not
          call what they call it. `count` is deliberately the ORIGINAL query's
          count, never the did-you-mean substitute's — correcting the words on
          screen must not erase the fact that the shopper's own words found
          nothing. */}
      {search && <TrackEvent type="search" query={search} resultsCount={count} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-charcoal">{title}</h1>
        <p className="text-brand-charcoal-light mt-1">
          {gridCount} product{gridCount !== 1 ? 's' : ''}{search ? ' found' : ' available'}
        </p>
        {/* Never substitute silently. The shopper sees their words came up empty
            and exactly what we searched instead — the link makes that
            substitution the real query, so it is shareable and bookmarkable. */}
        {suggested && suggestion?.suggestion && (
          <p className="text-brand-charcoal-light mt-2 text-sm">
            {foundThin ? (
              <>
                Only {count} match{count === 1 ? '' : 'es'} for{' '}
                <span className="font-semibold">&ldquo;{search}&rdquo;</span> — also showing results for{' '}
                <Link
                  href={buildHref(sp, { search: suggestion.suggestion })}
                  className="font-semibold text-brand-charcoal hover:underline"
                >
                  {suggestion.suggestion}
                </Link>
                .
              </>
            ) : (
              <>
                No matches for <span className="font-semibold">&ldquo;{search}&rdquo;</span> — showing results for{' '}
                <Link
                  href={buildHref(sp, { search: suggestion.suggestion })}
                  className="font-semibold text-brand-charcoal hover:underline"
                >
                  {suggestion.suggestion}
                </Link>{' '}
                instead.
              </>
            )}
          </p>
        )}
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
                  {gridCount} match{gridCount !== 1 ? 'es' : ''} ·{' '}
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
          <PackageCards packages={gridPackages} />

          {/* Non-packaged collections collapsed to one card each (room browse) */}
          <CollectionCards collections={collectionCards} />

          {/* Sectionals as family cards (built via the wizard), not piece tiles */}
          <SectionalFamilyCards families={gridFamilies} />

          {gridProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {gridProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {/* Room browse shows the whole room already, and a did-you-mean
                  substitution is displaying a DIFFERENT query's results — paging
                  either would page a set the URL does not describe. */}
              {!roomBrowse && !suggested && (
                <Pagination
                  page={page}
                  total={pageCount(count)}
                  hrefFor={(n) => buildHref(sp, { page: n > 1 ? String(n) : null })}
                />
              )}
            </>
          ) : gridFamilies.length === 0 && gridPackages.length === 0 && collectionCards.length === 0 ? (
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
