import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import { BRANDS, brandBySlug } from '@/lib/brands';
import { warrantyForBrand } from '@/lib/warranty';

interface Props {
  params: Promise<{ slug: string }>;
}

// Pre-render every curated brand; anything else 404s.
export const dynamicParams = false;
export function generateStaticParams() {
  return BRANDS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = brandBySlug(slug);
  if (!b) return { title: 'Brand Not Found', robots: { index: false, follow: false } };
  const description =
    b.tagline ||
    `${b.name} at ${SITE_NAME} — brand story, what they make, materials, care and warranty.`;
  const path = `/brands/${b.slug}`;
  return {
    title: `${b.name} Furniture`,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, title: `${b.name} — ${SITE_NAME}`, description },
    twitter: { title: `${b.name} — ${SITE_NAME}`, description },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const b = brandBySlug(slug);
  if (!b) notFound();

  const warranty = warrantyForBrand(b.name);
  const shopHref = `/shop?brand=${encodeURIComponent(b.name)}`;
  const meta = [b.founded && `Est. ${b.founded}`, b.headquarters].filter(Boolean);

  const brandLd = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    '@id': `${SITE_URL}/brands/${b.slug}#brand`,
    name: b.name,
    ...(b.website ? { url: b.website } : {}),
    ...(b.tagline ? { description: b.tagline } : {}),
    ...(b.story.length ? { slogan: b.tagline || undefined } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Brands', item: `${SITE_URL}/brands` },
      { '@type': 'ListItem', position: 2, name: b.name, item: `${SITE_URL}/brands/${b.slug}` },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd id="ld-brand" data={[brandLd, breadcrumbLd]} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-8">
        <Link href="/brands" className="hover:text-brand-charcoal transition-colors">Brands</Link>
        <span>/</span>
        <span className="text-brand-charcoal font-medium">{b.name}</span>
      </nav>

      {/* Hero */}
      <header className="mb-12">
        {b.logo && (
          <div className="mb-5 flex h-16 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.logo}
              alt={`${b.name} logo`}
              className="max-h-16 w-auto max-w-[240px] object-contain object-left"
            />
          </div>
        )}
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-brand-yellow-dark bg-brand-warm-gray px-3 py-1 rounded-full mb-3">
          {b.category}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">{b.name}</h1>
        {b.tagline && (
          <p className="text-lg text-brand-charcoal-light mt-2 leading-relaxed max-w-2xl">{b.tagline}</p>
        )}
        {meta.length > 0 && (
          <p className="text-sm text-brand-charcoal-light/80 mt-3">{meta.join(' • ')}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={shopHref} className="btn-brand text-sm px-6 py-2.5">Shop {b.name}</Link>
          {b.website && (
            <a
              href={b.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn-outline text-sm px-6 py-2.5"
            >
              Visit official site
            </a>
          )}
        </div>
      </header>

      {/* Story */}
      {b.story.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-brand-charcoal mb-3">The Story</h2>
          <div className="space-y-4 text-brand-charcoal-light leading-relaxed max-w-2xl">
            {b.story.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* What they make */}
      {b.specialties.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-brand-charcoal mb-4">What They Make</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {b.specialties.map((s) => (
              <li key={s} className="flex items-start gap-2 text-brand-charcoal-light">
                <span className="text-brand-yellow-dark mt-0.5 shrink-0" aria-hidden>✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Materials & construction */}
      {b.materials && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-brand-charcoal mb-3">Materials &amp; Construction</h2>
          <p className="text-brand-charcoal-light leading-relaxed max-w-2xl">{b.materials}</p>
        </section>
      )}

      {/* Care & cleaning */}
      {b.care.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-brand-charcoal mb-1">Care &amp; Cleaning</h2>
          <p className="text-sm text-brand-charcoal-light/80 mb-4">
            General guidance from {b.name}. Always follow the tag on your specific piece.
          </p>
          <div className="space-y-3">
            {b.care.map((c) => (
              <div key={c.surface} className="bg-brand-warm-gray rounded-xl p-5">
                <h3 className="font-semibold text-brand-charcoal mb-1">{c.surface}</h3>
                <p className="text-sm text-brand-charcoal-light leading-relaxed">{c.instructions}</p>
              </div>
            ))}
          </div>
          {b.careSourceUrl && (
            <a
              href={b.careSourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-yellow-dark hover:text-brand-charcoal transition-colors"
            >
              {b.name} official care guide →
            </a>
          )}
        </section>
      )}

      {/* Warranty — reuses the warranty registry */}
      {warranty && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-brand-charcoal mb-3">Warranty</h2>
          <div className="border border-brand-border rounded-xl p-5">
            {warranty.summary ? (
              <p className="text-brand-charcoal-light leading-relaxed">{warranty.summary}</p>
            ) : (
              <p className="text-brand-charcoal-light leading-relaxed">
                {b.name} pieces are covered by the manufacturer&apos;s limited warranty — our team
                will help you file any claim.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-4">
              {warranty.url ? (
                <a
                  href={warranty.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-yellow-dark hover:text-brand-charcoal transition-colors"
                >
                  View {b.name} warranty →
                </a>
              ) : null}
              <Link
                href={`/warranty#${b.slug}`}
                className="text-sm font-semibold text-brand-charcoal-light hover:text-brand-charcoal transition-colors"
              >
                How claims work →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="bg-brand-charcoal text-white rounded-2xl p-8 sm:p-10 text-center">
        <h2 className="text-2xl font-bold mb-3">Shop {b.name} at Flipsies</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Browse our in-stock {b.name} selection, or come see it in person at a Birmingham-area showroom.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href={shopHref} className="btn-brand">Shop {b.name}</Link>
          <Link
            href="/locations"
            className="inline-flex items-center justify-center rounded-lg border-2 border-white/40 px-7 py-3
              text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Find a Showroom
          </Link>
        </div>
      </div>

      {/* Back to all brands */}
      <div className="mt-10 text-center">
        <Link href="/brands" className="text-sm text-brand-charcoal-light hover:text-brand-charcoal transition-colors">
          ← All brands
        </Link>
      </div>
    </div>
  );
}
