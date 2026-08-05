import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL, SHOWROOMS } from '@/lib/site';
import { BRANDS } from '@/lib/brands';
import { ROOM_SLUGS, categoryPath, slugify } from '@/lib/catalogSlugs';

// Cached route handler — refresh daily. The catalog moves, but a day-stale
// sitemap is harmless and keeps us off the backend on every crawl.
export const revalidate = 86400;

type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency'];

const STATIC_PATHS: { path: string; priority: number; changeFrequency: ChangeFreq }[] = [
  { path: '/',           priority: 1.0, changeFrequency: 'daily' },
  { path: '/shop',       priority: 0.9, changeFrequency: 'daily' },
  { path: '/sectionals', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/deals',      priority: 0.8, changeFrequency: 'daily' },
  { path: '/brands',     priority: 0.7, changeFrequency: 'weekly' },
  { path: '/warranty',   priority: 0.6, changeFrequency: 'monthly' },
  { path: '/locations',  priority: 0.7, changeFrequency: 'monthly' },
  { path: '/delivery',   priority: 0.6, changeFrequency: 'monthly' },
  { path: '/returns',    priority: 0.6, changeFrequency: 'monthly' },
  { path: '/financing',  priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about-us',   priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact',    priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy',    priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms',      priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((s) => ({
    url: `${SITE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  // Per-showroom location pages (/locations/[slug]).
  for (const sr of SHOWROOMS) {
    entries.push({
      url: `${SITE_URL}/locations/${sr.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  // Per-brand profile pages (/brands/[slug]).
  for (const b of BRANDS) {
    entries.push({
      url: `${SITE_URL}/brands/${b.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  // Room landing pages (/shop/living-room, …) — the head terms ("bedroom
  // furniture Birmingham"), and the destination of every legacy old-site 308,
  // so they outrank the piece-level category pages in priority. Derived from
  // ROOM_SLUGS values so the home-office → Office alias emits once.
  for (const room of new Set(Object.values(ROOM_SLUGS))) {
    entries.push({
      url: `${SITE_URL}/shop/${slugify(room)}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  // Category landing pages (/shop/[category]) — canonical lowercase-hyphen
  // slugs, matching what the route now 308s every %20-encoded form to.
  try {
    const { categories } = await api.getCategories();
    for (const c of categories) {
      entries.push({
        url: `${SITE_URL}${categoryPath(c, categories)}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  } catch {
    // Categories endpoint down — ship the rest of the sitemap anyway.
  }

  // Every published product. Page until a short page arrives — don't trust
  // the estimated count for termination (it can run high or low). Hard cap
  // at the 50k Sitemaps limit as a backstop.
  try {
    const PAGE = 200;
    let offset = 0;
    for (;;) {
      const { data } = await api.getProducts({ limit: PAGE, offset });
      for (const p of data) {
        // An imageless PDP cannot convert and cannot rank, so submitting it
        // just spends crawl budget on a page we'd rather Google didn't judge
        // us by. It stays live and searchable — this only withdraws the
        // invitation, and each product re-enters the moment a photo lands.
        if (!p.images?.length && !p.image_url) continue;
        entries.push({
          url: `${SITE_URL}/product/${p.id}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
      if (data.length < PAGE || offset >= 50000) break;
      offset += PAGE;
    }
  } catch {
    // Products endpoint down — ship the static + category entries.
  }

  return entries;
}
