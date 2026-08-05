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
import { buildCollectionCards, normColl } from '@/lib/collectionCards';
import { fetchPackages, type StorefrontPackage } from '@/lib/packages';

interface Props {
  params: Promise<{ category: string }>;
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const { decoded, resolved } = await resolveSegment(category);

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

  return pageMetadata({
    title: `${resolved.value} — Shop`,
    description: `Browse ${decoded} at Flipsies Furniture. Quality furniture at honest prices.`,
    path: resolved.canonical,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const { categories, resolved } = await resolveSegment(category);

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
    const productQuery: Record<string, string | number> = isRoom
      ? { room: label, limit: 1000, exclude_sectionals: 1 }
      : { category: label, limit: 48 };

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

  const nothingToShow = loose.length === 0 && cards.length === 0 && packages.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd id="ld-category" data={breadcrumbLd} />
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {loose.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
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
