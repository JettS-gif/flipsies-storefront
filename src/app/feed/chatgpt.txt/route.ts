import { fetchAllProducts } from '@/lib/allProducts';
import { buildFeed } from '@/lib/productFeed';

// 15 minutes, because that is the cadence OpenAI accepts feed updates at — a
// longer window would publish stock and price we already know to be stale, and
// availability is the one field a shopping surface punishes hardest for lying
// about. Cheap to serve: this is a prerendered static body between refreshes.
export const revalidate = 900;
export const dynamic = 'force-static';

// Paging lives in @/lib/allProducts. It used to be a local loop that asked for
// 200 and treated a short page as the end — which stopped after ONE page from
// 2026-08-19, when the backend began clamping limit to 100. This feed served 94
// products instead of ~2,478 for two and a half weeks without erroring.
//
// include_never_stock: the default browse deliberately hides special-order
// items with nothing on hand and nothing on order, because they pollute a wall
// of tiles. A feed is a catalog manifest, not a browse grid, and that rule was
// silently withholding 281 priced, imaged, buyable products from every shopping
// surface while their PDPs stayed live. They list honestly as `backorder`.
export async function GET() {
  const products = await fetchAllProducts({ include_never_stock: 1 });
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
