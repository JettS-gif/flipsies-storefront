import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import AddPackageToCartButton from '@/components/AddPackageToCartButton';
import { fetchPackage } from '@/lib/packages';
import { SITE_URL, SITE_NAME } from '@/lib/site';

interface Props {
  params: Promise<{ id: string }>;
}

// Shared between generateMetadata and the page so one request = one fetch.
const getPackage = cache((id: string) => fetchPackage(id));

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getPackage(id);
  if (!pkg) return { title: 'Set Not Found', robots: { index: false, follow: false } };
  const description =
    `${pkg.name} — ${money(pkg.price)} at ${SITE_NAME}` +
    (pkg.savings > 0 ? `, saving ${money(pkg.savings)} over buying the pieces separately.` : '.');
  const path = `/package/${id}`;
  return {
    title: pkg.name,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, title: pkg.name, description },
    twitter: { title: pkg.name, description },
  };
}

export default async function PackagePage({ params }: Props) {
  const { id } = await params;
  const pkg = await getPackage(id);
  if (!pkg) notFound();

  const url = `${SITE_URL}/package/${pkg.id}`;
  const hero = pkg.images?.[0] || null;
  const absImages = (pkg.images || []).map((u) => (u.startsWith('http') ? u : `${SITE_URL}${u}`));

  // The price the customer pays is the BUNDLE price, and it is the price the
  // offer must advertise — the components' individual retail is the strike-
  // through, not the offer. Mirrors the product page's rule that structured
  // data tracks what is actually rendered.
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#package`,
    name: pkg.name,
    ...(pkg.sku ? { sku: pkg.sku } : {}),
    ...(absImages.length ? { image: absImages } : {}),
    ...(pkg.description ? { description: pkg.description } : {}),
    ...(pkg.category ? { category: pkg.category } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: Number(pkg.price).toFixed(2),
      availability: pkg.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
    ...(pkg.items.length
      ? {
          isRelatedTo: pkg.items.map((i) => ({
            '@type': 'Product',
            name: i.name,
            ...(i.sku ? { sku: i.sku } : {}),
          })),
        }
      : {}),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd data={ld} />

      <nav className="text-sm text-brand-charcoal-light mb-6">
        <Link href="/shop" className="hover:underline">Shop</Link>
        <span className="mx-2">/</span>
        <span className="text-brand-charcoal">{pkg.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="bg-brand-warm-gray rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={pkg.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl opacity-30">🛏</span>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-brand-charcoal">{pkg.name}</h1>
          {pkg.collection && (
            <Link
              href={`/shop?collection=${encodeURIComponent(pkg.collection)}`}
              className="inline-block mt-2 text-xs font-semibold text-brand-green border border-brand-green/30 bg-brand-green/5 px-2.5 py-1 rounded-full hover:bg-brand-green/10 transition-colors"
            >
              {pkg.collection} — shop individual pieces
            </Link>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-brand-charcoal">{money(pkg.price)}</span>
            {pkg.compare_at_price > pkg.price && (
              <>
                <span className="text-lg text-brand-charcoal-light line-through">{money(pkg.compare_at_price)}</span>
                <span className="bg-brand-yellow text-brand-charcoal text-xs font-bold px-2 py-1 rounded-full">
                  Save {money(pkg.savings)}
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-brand-charcoal-light mt-2">
            {pkg.in_stock ? 'In stock — all pieces available' : 'Special order'}
          </p>

          {pkg.description && (
            <p className="text-sm text-brand-charcoal-light mt-4 leading-relaxed">{pkg.description}</p>
          )}

          <AddPackageToCartButton
            pkg={{
              id: pkg.id, sku: pkg.sku, name: pkg.name,
              price: pkg.price, images: pkg.images, category: pkg.category,
            }}
          />

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-brand-charcoal mb-3">
              What&apos;s included ({pkg.item_count} pieces)
            </h2>
            <ul className="divide-y divide-brand-border border border-brand-border rounded-lg overflow-hidden">
              {pkg.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                  <div className="w-12 h-12 shrink-0 bg-brand-warm-gray rounded flex items-center justify-center overflow-hidden">
                    {i.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.images[0]} alt={i.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg opacity-30">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${i.id}`} className="text-sm text-brand-charcoal hover:text-brand-yellow-dark transition-colors line-clamp-1">
                      {i.name}
                    </Link>
                    <p className="text-xs text-brand-charcoal-light">
                      {i.qty > 1 ? `${i.qty} × ` : ''}
                      {i.retail_price != null ? money(Number(i.retail_price)) : ''}
                      {!i.in_stock && ' · special order'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
