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
export const SITE_TAGLINE = 'Quality Furniture at Honest Prices';
export const SITE_DESCRIPTION =
  'Shop sofas, sectionals, bedroom sets, dining furniture and more at Flipsies Furniture. Visit our showrooms in Hoover and Irondale, Alabama.';

export const STORE_EMAIL = 'info@flipsiesfurniture.com';

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
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  mapUrl: string;
}

// Source of truth mirrors locations/page.tsx LOCATIONS. Kept here so the
// LocalBusiness JSON-LD and the page render stay in sync from one place.
export const SHOWROOMS: Showroom[] = [
  {
    name: 'Flipsies Furniture — Hoover',
    street: '1709 Montgomery Hwy S',
    city: 'Hoover',
    state: 'AL',
    zip: '35244',
    phone: '(205) 988-3551',
    mapUrl: 'https://maps.google.com/?q=1709+Montgomery+Hwy+S+Hoover+AL+35244',
  },
  {
    name: 'Flipsies Furniture — Irondale',
    street: '1811 Crestwood Blvd',
    city: 'Irondale',
    state: 'AL',
    zip: '35210',
    phone: '(205) 956-0600',
    mapUrl: 'https://maps.google.com/?q=1811+Crestwood+Blvd+Irondale+AL+35210',
  },
];

// schema.org openingHours — both showrooms keep the same hours.
export const OPENING_HOURS = ['Mo-Sa 10:00-19:00', 'Su 12:00-17:00'];

// Public social profiles for Organization.sameAs. Empty until the handles
// are confirmed; an empty array is omitted from the JSON-LD so we never
// emit a dead sameAs.
export const SOCIAL_PROFILES: string[] = [];

// Per-page metadata helper. Canonical + openGraph.url are RELATIVE — the
// root layout's metadataBase resolves them to absolute URLs. siteName,
// locale and the default og:image (app/opengraph-image) are inherited from
// the root, so each page only declares what's page-specific.
export function pageMetadata(opts: {
  title: string;
  description?: string;
  path: string; // leading-slash path, e.g. '/about-us'
  images?: string[];
}): Metadata {
  const { title, description, path, images } = opts;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      ...(images ? { images } : {}),
    },
    twitter: {
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}
