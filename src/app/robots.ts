import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Transactional / internal routes that carry no search value. Shared by every
// rule below so a new one can't accidentally expose checkout.
const NO_SEARCH_VALUE = [
  '/checkout',
  '/cart',
  '/track-order',
  '/staff-login',
  '/vendor/',
  '/scan/',
  '/api/',
];

// Pure-extraction crawlers: SEO-tooling and data resellers that consume real
// catalog queries and return nothing — no shoppers, no AI surface, no ranking.
// Bytespider is here rather than with the AI agents below because it is the
// worst-behaved of the group in practice.
const EXTRACTIVE_BOTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
  'Bytespider',
];

// AI assistants we WANT indexing us — the whole point of /feed/chatgpt.txt and
// /feed/google.txt. They stay allowed; they just may not sprint. Each is asked
// to pace itself because the cheap path for them is the pre-rendered feed, not
// walking every category page.
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'meta-externalagent',
];

// Why crawl-delay at all (2026-08-19): the backend absorbed ~4 req/s for four
// hours until Supabase locked up. Every catalog page fans out to the products
// LIST endpoint — and a product page adds two more via SimilarProducts and
// RelatedProducts — so one page render is several backend queries. An
// unthrottled crawler multiplies straight through that.
//
// Do NOT mistake this file for protection. Googlebot ignores crawl-delay
// outright (it takes rate from Search Console), and the worst offenders ignore
// robots.txt entirely. This only shapes the well-behaved traffic. The load
// ceiling has to be enforced server-side — the read cache and a per-IP limit on
// the storefront GETs are what actually hold.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: NO_SEARCH_VALUE,
        crawlDelay: 10,
      },
      {
        userAgent: AI_AGENTS,
        allow: '/',
        disallow: NO_SEARCH_VALUE,
        crawlDelay: 10,
      },
      {
        userAgent: EXTRACTIVE_BOTS,
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
