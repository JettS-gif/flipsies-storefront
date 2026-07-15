import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import CheckDeliveryButton from '@/components/CheckDeliveryButton';
import {
  SITE_URL,
  SITE_NAME,
  SHOWROOMS,
  HOURS_DISPLAY,
  OPENING_HOURS,
  showroomBySlug,
} from '@/lib/site';

interface Props {
  params: Promise<{ slug: string }>;
}

// Pre-render both showroom pages; anything else 404s.
export const dynamicParams = false;
export function generateStaticParams() {
  return SHOWROOMS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sr = showroomBySlug(slug);
  if (!sr) return { title: 'Showroom Not Found', robots: { index: false, follow: false } };
  const title = `${sr.city} Showroom`;
  const description =
    `Visit ${SITE_NAME} in ${sr.city}, AL — ${sr.street}, ${sr.city}, ${sr.state} ${sr.zip}. ` +
    `In-stock furniture at honest everyday prices with fast local delivery. Open Mon–Sat 10–7, Sun 11–6. Call ${sr.phone}.`;
  const path = `/locations/${sr.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, title: `${title} — ${SITE_NAME}`, description },
    twitter: { title: `${title} — ${SITE_NAME}`, description },
  };
}

export default async function ShowroomPage({ params }: Props) {
  const { slug } = await params;
  const sr = showroomBySlug(slug);
  if (!sr) notFound();

  const fullAddress = `${sr.street}, ${sr.city}, ${sr.state} ${sr.zip}`;
  const telHref = `tel:${sr.phone.replace(/\D/g, '')}`;
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&z=15&output=embed`;
  const other = SHOWROOMS.find((s) => s.slug !== sr.slug);

  const storeLd = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${SITE_URL}/locations/${sr.slug}#store`,
    name: `${SITE_NAME} — ${sr.city}`,
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    url: `${SITE_URL}/locations/${sr.slug}`,
    image: `${SITE_URL}/icon`,
    telephone: sr.phone,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: sr.street,
      addressLocality: sr.city,
      addressRegion: sr.state,
      postalCode: sr.zip,
      addressCountry: 'US',
    },
    areaServed: 'Birmingham metro, Alabama',
    openingHours: OPENING_HOURS,
    hasMap: sr.mapUrl,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Locations', item: `${SITE_URL}/locations` },
      { '@type': 'ListItem', position: 2, name: `${sr.city} Showroom`, item: `${SITE_URL}/locations/${sr.slug}` },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd data={[storeLd, breadcrumbLd]} />

      <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-8">
        <Link href="/locations" className="hover:text-brand-charcoal transition-colors">Locations</Link>
        <span>/</span>
        <span className="text-brand-charcoal font-medium">{sr.city} Showroom</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* Details */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow-dark mb-2">
            Flipsies Furniture
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">{sr.city} Showroom</h1>
          <address className="not-italic text-brand-charcoal-light mt-3 leading-relaxed">
            {sr.street}
            <br />
            {sr.city}, {sr.state} {sr.zip}
          </address>

          <div className="mt-4 flex flex-wrap gap-3">
            <a href={telHref} className="btn-brand text-sm px-6 py-2.5">Call {sr.phone}</a>
            <a href={sr.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm px-6 py-2.5">
              Get Directions
            </a>
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">Hours</h2>
            <div className="border border-brand-border rounded-lg overflow-hidden max-w-sm">
              {HOURS_DISPLAY.map((h, i) => (
                <div
                  key={h.days}
                  className={`flex justify-between text-sm px-4 py-2.5 ${i > 0 ? 'border-t border-brand-border' : ''}`}
                >
                  <span className="text-brand-charcoal-light">{h.days}</span>
                  <span className="font-medium text-brand-charcoal">{h.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">At this showroom</h2>
            <div className="flex flex-wrap gap-2">
              {sr.features.map((f) => (
                <span key={f} className="text-xs bg-brand-warm-gray text-brand-charcoal-light px-3 py-1 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md">
            <Link href="/shop" className="btn-brand flex-1 text-center text-sm py-3">Shop In-Stock</Link>
            <CheckDeliveryButton className="flex-1 text-sm !py-3" />
          </div>
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-brand-border bg-brand-warm-gray">
          <iframe
            title={`Map to the ${sr.city} showroom`}
            src={mapEmbed}
            className="w-full h-[360px] lg:h-[460px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      {other && (
        <div className="mt-14 border-t border-brand-border pt-8 text-center">
          <p className="text-brand-charcoal-light">
            Also visit our{' '}
            <Link href={`/locations/${other.slug}`} className="text-brand-green font-semibold hover:underline">
              {other.city} showroom
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
