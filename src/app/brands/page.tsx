import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { pageMetadata, SITE_URL, SITE_NAME } from '@/lib/site';
import { BRANDS, CATEGORY_ORDER, type BrandCategory } from '@/lib/brands';
import { fetchFacets } from '@/lib/facets';

export const metadata = pageMetadata({
  title: 'Our Brands',
  description:
    'Meet the furniture makers behind Flipsies Furniture — Southern Motion, Jackson Catnapper, Hooker, Luke Leather, MLily and more. Brand stories, materials, care guides and warranties.',
  path: '/brands',
});

// Section blurbs per category — a plain descriptor, no brand-specific claims.
const CATEGORY_BLURB: Record<BrandCategory, string> = {
  Upholstery: 'Sofas, sectionals, and reclining motion furniture.',
  Leather: 'Top-grain and full-leather seating specialists.',
  Casegoods: 'Bedroom, occasional, office, and accent furniture.',
  Dining: 'Dining sets, counter height, and occasional tables.',
  Mattresses: 'Mattresses and adjustable sleep systems.',
  'Home Accents': 'Candles, décor, and finishing touches for the home.',
};

export default async function BrandsPage() {
  // Live per-brand product counts (best-effort — the grid still renders if the
  // facets call fails; counts just don't show).
  const facets = await fetchFacets();
  const countByName = new Map((facets?.brands ?? []).map((b) => [b.value, b.count]));

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    brands: BRANDS.filter((b) => b.category === cat),
  })).filter((g) => g.brands.length > 0);

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/brands#page`,
    name: `Our Brands — ${SITE_NAME}`,
    url: `${SITE_URL}/brands`,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: BRANDS.map((b) => ({ '@type': 'Brand', name: b.name })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Brands', item: `${SITE_URL}/brands` },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd id="ld-brands" data={[collectionLd, breadcrumbLd]} />

      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow-dark mb-2">
          The makers we carry
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal mb-4">Our Brands</h1>
        <p className="text-lg text-brand-charcoal-light leading-relaxed">
          We hand-pick manufacturers that build furniture to last. Get to know their stories,
          what they make, how their pieces are built and cared for, and the warranty behind them.
        </p>
      </div>

      {/* Grouped brand cards */}
      <div className="space-y-14">
        {grouped.map(({ cat, brands }) => (
          <section key={cat}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-brand-charcoal">{cat}</h2>
              <p className="text-sm text-brand-charcoal-light">{CATEGORY_BLURB[cat]}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((b) => {
                const count = countByName.get(b.name);
                return (
                  <Link
                    key={b.slug}
                    href={`/brands/${b.slug}`}
                    className="group bg-white border border-brand-border rounded-xl p-5 hover:shadow-md
                      hover:border-brand-yellow transition-all flex flex-col"
                  >
                    {b.logo && (
                      <div className="mb-3 flex h-9 items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={b.logo}
                          alt={`${b.name} logo`}
                          className="max-h-9 w-auto max-w-[150px] object-contain object-left"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold text-brand-charcoal group-hover:text-brand-yellow-dark transition-colors">
                        {b.name}
                      </h3>
                      {typeof count === 'number' && count > 0 && (
                        <span className="shrink-0 text-[11px] text-brand-charcoal-light bg-brand-warm-gray px-2 py-0.5 rounded-full tabular-nums">
                          {count} {count === 1 ? 'piece' : 'pieces'}
                        </span>
                      )}
                    </div>
                    {b.tagline && (
                      <p className="text-sm text-brand-charcoal-light mt-1 leading-relaxed line-clamp-2">
                        {b.tagline}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-yellow-dark">
                      Explore {b.name} →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 bg-brand-warm-gray rounded-2xl p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-brand-charcoal mb-3">See these brands in person</h2>
        <p className="text-brand-charcoal-light mb-6 max-w-lg mx-auto">
          Our Hoover and Irondale showrooms carry these makers on the floor. Come sit, feel the
          materials, and find your piece.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/shop" className="btn-brand">Shop All Brands</Link>
          <Link href="/locations" className="btn-outline">Find a Showroom</Link>
        </div>
      </div>
    </div>
  );
}
