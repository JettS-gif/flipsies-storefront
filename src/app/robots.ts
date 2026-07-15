import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Crawl everything except transactional / internal / utility routes that
// carry no search value (and shouldn't surface in results).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/checkout',
        '/cart',
        '/track-order',
        '/staff-login',
        '/vendor/',
        '/scan/',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
