import { api, type Product } from '@/lib/api';
import { buildFeed } from '@/lib/productFeed';

// 15 minutes, because that is the cadence OpenAI accepts feed updates at — a
// longer window would publish stock and price we already know to be stale, and
// availability is the one field a shopping surface punishes hardest for lying
// about. Cheap to serve: this is a prerendered static body between refreshes.
export const revalidate = 900;
export const dynamic = 'force-static';

// Matches sitemap.ts. The estimated count runs high and low, so pages until a
// short page arrives rather than trusting it.
const PAGE = 200;
const MAX_PRODUCTS = 50000;

async function allProducts(): Promise<Product[]> {
  const out: Product[] = [];
  let offset = 0;
  for (;;) {
    const { data } = await api.getProducts({ limit: PAGE, offset });
    out.push(...data);
    if (data.length < PAGE || out.length >= MAX_PRODUCTS) break;
    offset += PAGE;
  }
  return out;
}

export async function GET() {
  const products = await allProducts();
  const body = buildFeed(products);

  return new Response(body, {
    headers: {
      // Tab-separated, which the spec accepts as .txt/.tsv. Charset is explicit
      // because the catalog carries inch marks and typographic dashes.
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Content-Disposition': 'inline; filename="flipsies-chatgpt-feed.txt"',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
}
