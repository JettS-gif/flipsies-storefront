import { api } from '@/lib/api';
import type { Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import CollectionCards from '@/components/CollectionCards';
import PackageCards from '@/components/PackageCards';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, pageMetadata } from '@/lib/site';
import { resolveCatalogSlug, categoryPath, type Resolved } from '@/lib/catalogSlugs';
import Pagination from '@/components/Pagination';
import { PAGE_SIZE, pageOf, pageCount } from '@/lib/shopFilters';
import { buildCollectionCards, normColl } from '@/lib/collectionCards';
import { fetchPackages, type StorefrontPackage } from '@/lib/packages';

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}

// A paginated page canonicals to ITSELF, never back to page 1 — pointing page 3
// at page 1 tells Google the 48 products only on page 3 are duplicates of a set
// they do not appear in, which is how you lose them from the index entirely.
// (This is the opposite of the /shop facet policy in shop/page.tsx, which
// deliberately collapses filtered views onto /shop. Different problem.)
const pagedPath = (base: string, page: number) => (page > 1 ? `${base}?page=${page}` : base);

// Built in one place so generateMetadata and the page issue the IDENTICAL
// request — Next memoizes fetches within a render pass, so asking twice costs
// one round trip, and metadata that disagreed with the body would be worse than
// the extra call anyway.
const productQueryFor = (label: string, isRoom: boolean, page: number): Record<string, string | number> =>
  isRoom
    ? { room: label, limit: 1000, exclude_sectionals: 1 }
    : { category: label, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

// A name with a literal % (none today, but a category is free text) would make
// decodeURIComponent throw and take the whole route down.
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Shared by generateMetadata and the page itself. Both need the category list
 * to resolve a slug; the two getCategories calls dedupe inside one render pass
 * and are revalidate-cached besides.
 *
 * `catsOk` is the important part: if the categories fetch fails we must NOT
 * 404, or a transient backend blip deindexes the entire catalog. On failure we
 * fall through to the old behaviour — treat the segment as a category name and
 * let the page render whatever the products call returns.
 */
async function resolveSegment(segment: string) {
  const decoded = safeDecode(segment);
  let categories: string[] = [];
  let catsOk = true;
  try {
    categories = (await api.getCategories()).categories || [];
  } catch {
    catsOk = false;
  }
  const resolved: Resolved = catsOk
    ? resolveCatalogSlug(decoded, categories)
    : { kind: 'category', value: decoded, canonical: `/shop/${encodeURIComponent(decoded)}` };
  return { decoded, categories, catsOk, resolved };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params;
  const { decoded, resolved } = await resolveSegment(category);
  const page = pageOf(await searchParams);
  const suffix = page > 1 ? ` — Page ${page}` : '';

  if (resolved.kind === 'none') return { title: 'Not Found', robots: { index: false, follow: false } };

  if (resolved.kind === 'room') {
    return pageMetadata({
      title: `${resolved.value} Furniture`,
      description:
        `Shop ${resolved.value.toLowerCase()} furniture at Flipsies Furniture — browse complete ` +
        `collections in stock at our Hoover and Irondale showrooms, with local Birmingham delivery.`,
      path: resolved.canonical,
    });
  }

  // An out-of-range page renders the not-found UI, which injects its own
  // noindex. Without this check the category metadata would ALSO emit
  // "index, follow" and a canonical pointing at the bogus page — two
  // contradictory robots tags on one document.
  if (page > 1) {
    // A throw counts as empty, deliberately. The backend answers an out-of-range
    // offset with HTTP 500 "Requested range not satisfiable" rather than an empty
    // 200, so the error IS the out-of-range signal. And if it throws for any
    // other reason the page body catches it, ends up with no products, and
    // notFound()s regardless — so noindex is the honest description of what
    // renders either way.
    const empty = await api
      .getProducts(productQueryFor(resolved.value, false, page))
      .then((r) => !(r.data || []).length)
      .catch(() => true);
    if (empty) return { title: 'Not Found', robots: { index: false, follow: false } };
  }

  return pageMetadata({
    title: `${resolved.value} — Shop${suffix}`,
    description: `Browse ${decoded} at Flipsies Furniture. Quality furniture at honest prices.`,
    path: pagedPath(resolved.canonical, page),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const { categories, resolved } = await resolveSegment(category);
  const page = pageOf(await searchParams);

  // The guard this route never had. Any string used to render an indexable page
  // with the slug echoed as the <h1> — an unbounded space of crawlable thin
  // pages. Because this segment streams (loading.tsx sits above it) the response
  // is still HTTP 200, but notFound() injects <meta name="robots" content=
  // "noindex">, which is what actually keeps it out of the index; the Next docs
  // call this out explicitly under loading.tsx "Status Codes". Getting a true
  // 404 status would need a proxy check ahead of the render.
  if (resolved.kind === 'none') notFound();

  // Duplicate URL forms (/shop/Sofa, /shop/Accent%20Cabinet) consolidate via the
  // canonical tag generateMetadata emits, not a redirect: an in-page redirect
  // would stream as a client-side meta tag on a 200 and pass no equity. This is
  // the same mechanism shop/page.tsx already uses for its facet URLs.
  const isRoom = resolved.kind === 'room';
  const label = resolved.value;

  let products: Product[] = [];
  let packages: StorefrontPackage[] = [];
  let count = 0;

  try {
    // A room browse fetches the whole room so it can collapse to one card per
    // collection — the same 1000 the /shop?room= path uses (the endpoint caps
    // there anyway, and the largest room is 941).
    // A room browse is NOT paginated: it fetches the whole room and collapses it
    // to one card per collection, so nothing is hidden to begin with — the 48-cap
    // problem this pagination solves only ever existed on category pages.
    const productQuery = productQueryFor(label, isRoom, page);

    const [prodRes, pkgList] = await Promise.all([
      api.getProducts(productQuery),
      isRoom ? fetchPackages({ room: label }).catch(() => []) : Promise.resolve([]),
    ]);
    products = prodRes.data || [];
    count = prodRes.count || 0;
    packages = pkgList || [];
  } catch (e) {
    console.error('Failed to load products:', e);
  }

  // Room pages lead with collections, not pieces: a shopper browsing "Bedroom"
  // wants the set, and 941 individual Living Room tiles is the noise this cuts.
  const packagedCollections = new Set(packages.map((p) => normColl(p.collection)).filter(Boolean));
  const { cards, loose } = isRoom
    ? buildCollectionCards(products, packagedCollections)
    : { cards: [], loose: products };

  const catHref = (c: string) => (c === 'Sectional' ? '/sectionals' : categoryPath(c, categories));
  const url = `${SITE_URL}${resolved.canonical}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: `${SITE_URL}/shop` },
      { '@type': 'ListItem', position: 2, name: label, item: url },
    ],
  };

  // Google supports ItemList on a listing page to describe the products it links
  // to. Positions continue across pages rather than restarting at 1 on every
  // page, so the list describes the whole category, not just this slice.
  const itemListLd = loose.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: label,
        numberOfItems: count,
        itemListElement: loose.map((prod, i) => ({
          '@type': 'ListItem',
          position: (page - 1) * PAGE_SIZE + i + 1,
          url: `${SITE_URL}/product/${prod.id}`,
        })),
      }
    : null;

  // An out-of-range page is a made-up URL, and leaving it as a 200 would rebuild
  // exactly the unbounded thin-page space the notFound() guard above closed —
  // ?page=9999 is as arbitrary a string as /shop/zzz.
  if (!isRoom && page > 1 && loose.length === 0) notFound();

  const nothingToShow = loose.length === 0 && cards.length === 0 && packages.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd id="ld-category" data={breadcrumbLd} />
      {itemListLd && <JsonLd id="ld-category-items" data={itemListLd} />}
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-6">
        <Link href="/shop" className="hover:text-brand-charcoal transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-brand-charcoal font-medium">{label}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-charcoal">
          {isRoom ? `${label} Furniture` : label}
        </h1>
        <p className="text-brand-charcoal-light mt-1">
          {isRoom && (cards.length > 0 || packages.length > 0)
            ? `${cards.length + packages.length} collection${cards.length + packages.length !== 1 ? 's' : ''} · ${count} piece${count !== 1 ? 's' : ''}`
            : `${count} product${count !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-4">Categories</h2>
          <nav className="space-y-1">
            <Link href="/shop"
              className="block px-3 py-2 text-sm text-brand-charcoal-light hover:text-brand-charcoal
                hover:bg-brand-warm-gray rounded-lg transition-colors">
              All Products
            </Link>
            {categories.map(cat => (
              <Link key={cat} href={catHref(cat)}
                className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                  cat === label
                    ? 'font-medium text-brand-charcoal bg-brand-warm-gray'
                    : 'text-brand-charcoal-light hover:text-brand-charcoal hover:bg-brand-warm-gray'
                }`}>
                {cat}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {/* Mobile category pills */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 -mx-1 px-1">
            <Link href="/shop"
              className="shrink-0 px-4 py-2 rounded-full text-xs font-medium border border-brand-border
                text-brand-charcoal-light hover:border-brand-yellow transition-colors">
              All
            </Link>
            {categories.map(cat => (
              <Link key={cat} href={catHref(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  cat === label
                    ? 'bg-brand-charcoal text-white'
                    : 'border border-brand-border text-brand-charcoal-light hover:border-brand-yellow'
                }`}>
                {cat}
              </Link>
            ))}
          </div>

          {/* Bundles as set cards, not five near-identical piece tiles */}
          <PackageCards packages={packages} />

          {/* Non-packaged collections collapsed to one card each */}
          <CollectionCards collections={cards} />

          {loose.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {loose.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {!isRoom && (
                <Pagination
                  page={page}
                  total={pageCount(count)}
                  hrefFor={(n) => pagedPath(resolved.canonical, n)}
                />
              )}
            </>
          ) : nothingToShow ? (
            <div className="text-center py-20 text-brand-charcoal-light">
              <div className="text-4xl mb-4">📦</div>
              <p>No products in this category yet.</p>
              <Link href="/shop" className="text-brand-yellow-dark hover:underline mt-2 inline-block">
                Browse all products
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
