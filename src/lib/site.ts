// Central site/SEO config. Single source of truth for every absolute URL
// search engines see (metadataBase, sitemap, robots, JSON-LD) plus the
// brand facts the next/og image routes need (they can't read globals.css).

import type { Metadata } from 'next';

// Canonical origin. Env override lets a preview/staging deploy point
// elsewhere without a code change. Trailing slash stripped so
// `${SITE_URL}/path` never doubles up.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.flipsiesfurniture.com'
).replace(/\/$/, '');

export const SITE_NAME = 'Flipsies Furniture';

// The file-convention OG image at app/opengraph-image.tsx. Referenced by path so
// pages that declare their own openGraph still get a preview image.
export const OG_IMAGE = '/opengraph-image';
export const SITE_TAGLINE = 'Quality Furniture at Honest Prices';
export const SITE_DESCRIPTION =
  'Shop sofas, sectionals, bedroom sets, dining furniture and more at Flipsies Furniture. Visit our showrooms in Hoover and Irondale, Alabama.';

export const STORE_EMAIL = 'jett@flipsiesfurniture.com';

/**
 * Accessibility accommodation contact (Jett, 2026-08-05).
 *
 * A named person and a stated response time, deliberately — an unattended
 * "accessibility@" alias is worse than nothing, because the page becomes a
 * promise nobody is keeping. Anyone changing the 72 hours should be sure it is
 * still true; the whole value of the page is that it is honest.
 */
export const ACCESSIBILITY = {
  contactName:  'Jett Schencker',
  phone:        '(205) 764-3741',
  phoneHref:    '+12057643741',
  email:        STORE_EMAIL,
  responseTime: '72 hours',
  /** No formal audit has been done. See the page for why that is SAID, not hidden. */
  audited: false,
} as const;

// Brand palette — mirrors globals.css :root. The next/og ImageResponse
// routes run outside the DOM and can't resolve CSS custom properties, so
// the hex values live here too.
export const BRAND = {
  yellow: '#F5B731',
  yellowDark: '#C48E0A',
  charcoal: '#2D2D2D',
  charcoalLight: '#4A4A4A',
  warmGray: '#F8F7F4',
  green: '#1D9E75',
  white: '#FFFFFF',
} as const;

export interface Showroom {
  name: string;
  slug: string;        // URL segment for /locations/<slug>
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  mapUrl: string;
  features: string[];
  facebook: string;
  instagram: string;
  placeId: string;     // Google Place ID (for live reviews via Places API)
  /**
   * Google Business Profile store code, as shown in Business Profile Manager.
   * This is what a LOCAL product inventory feed keys on — it is how Google ties
   * "in stock nearby" to a specific floor. Null until the profile is linked to
   * Merchant Center; Hoover is blocked on a Business Manager org conflict
   * (2026-08-07), so it stays out of the local feed until that clears.
   */
  googleStoreCode: string | null;
}

// Source of truth mirrors locations/page.tsx LOCATIONS. Kept here so the
// LocalBusiness JSON-LD and the page render stay in sync from one place.
export const SHOWROOMS: Showroom[] = [
  {
    name: 'Flipsies Furniture — Hoover',
    slug: 'hoover',
    street: '1709 Montgomery Hwy S',
    city: 'Hoover',
    state: 'AL',
    zip: '35244',
    phone: '(205) 238-5076',
    mapUrl: 'https://maps.google.com/?q=1709+Montgomery+Hwy+S+Hoover+AL+35244',
    features: ['Full showroom', 'Mattress gallery', 'Financing available', 'Delivery scheduling'],
    facebook: 'https://www.facebook.com/profile.php?id=61588037572879',
    instagram: 'https://www.instagram.com/flipsies_furniture_hoover/',
    placeId: 'ChIJWUoEX4kjiYgRgwbX6-dbcRY',
    googleStoreCode: null, // blocked: claimed by a different Business Manager org
  },
  {
    name: 'Flipsies Furniture — Irondale',
    slug: 'irondale',
    street: '1811 Crestwood Blvd',
    city: 'Irondale',
    state: 'AL',
    zip: '35210',
    phone: '(205) 957-4001',
    mapUrl: 'https://maps.google.com/?q=1811+Crestwood+Blvd+Irondale+AL+35210',
    features: ['Full showroom', 'Warehouse pickup', 'Financing available', 'Same-day pickup available'],
    facebook: 'https://www.facebook.com/flipsiesfurniture/',
    instagram: 'https://www.instagram.com/flipsies_furniture_irondale/',
    placeId: 'ChIJfTugpW4jiYgRVYvbfQjE4w4',
    googleStoreCode: '8761534273338357514',
  },
];

/** Human-readable hours (single display source; OPENING_HOURS is the schema.org form). */
export const HOURS_DISPLAY = [
  { days: 'Monday – Saturday', time: '10:00 AM – 7:00 PM' },
  { days: 'Sunday', time: '11:00 AM – 6:00 PM' },
];

export function showroomBySlug(slug: string): Showroom | null {
  return SHOWROOMS.find((s) => s.slug === slug) || null;
}

// schema.org openingHours — both showrooms keep the same hours.
export const OPENING_HOURS = ['Mo-Sa 10:00-19:00', 'Su 11:00-18:00'];

// Organization.sameAs — every showroom's public profiles, so Google links the
// brand entity to all of them. Socials are per-location (no single brand
// account), so this flattens both showrooms' Facebook + Instagram.
export const SOCIAL_PROFILES: string[] = SHOWROOMS
  .flatMap((s) => [s.facebook, s.instagram])
  .filter(Boolean);

// Per-page metadata helper. Canonical + openGraph.url are RELATIVE — the
// root layout's metadataBase resolves them to absolute URLs.
//
// siteName and locale ARE inherited from the root. The og:image is NOT: a page
// that declares its own `openGraph` replaces the parent's object wholesale, so
// every page using this helper — /shop, /deals, /brands, /locations, /about-us,
// /delivery, /financing, /warranty, /privacy, /terms, /sectionals and all
// category and room pages — was sharing with NO preview image at all. Measured
// 2026-08-05: the homepage emitted 5 og:image tags and every one of those pages
// emitted zero. Hence the explicit default below; do not remove it on the
// assumption that inheritance covers it.
export function pageMetadata(opts: {
  title: string;
  description?: string;
  path: string; // leading-slash path, e.g. '/about-us'
  images?: string[];
  // Emit robots noindex/nofollow. For faceted views whose content is a subset
  // of a page that is already indexed — the canonical handles ranking, but only
  // this keeps a crawler from walking the combinatorial URL space in the first
  // place. See ShopFilters.tsx for what happened when nothing did.
  noindex?: boolean;
}): Metadata {
  const { title, description, path, images, noindex } = opts;
  const og = images ?? [OG_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: path,
      images: og,
    },
    twitter: {
      title,
      description,
      images: og,
    },
  };
}
