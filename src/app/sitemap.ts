import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

// Cached route handler — refresh daily. The catalog moves, but a day-stale
// sitemap is harmless and keeps us off the backend on every crawl.
export const revalidate = 86400;

type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency'];

const STATIC_PATHS: { path: string; priority: number; changeFrequency: ChangeFreq }[] = [
  { path: '/',           priority: 1.0, changeFrequency: 'daily' },
  { path: '/shop',       priority: 0.9, changeFrequency: 'daily' },
  { path: '/sectionals', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/deals',      priority: 0.8, changeFrequency: 'daily' },
  { path: '/locations',  priority: 0.7, changeFrequency: 'monthly' },
  { path: '/delivery',   priority: 0.6, changeFrequency: 'monthly' },
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

  // Category landing pages (/shop/[category]).
  try {
    const { categories } = await api.getCategories();
    for (const c of categories) {
      entries.push({
        url: `${SITE_URL}/shop/${encodeURIComponent(c)}`,
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
