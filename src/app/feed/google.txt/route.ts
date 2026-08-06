import { api, type Product } from '@/lib/api';
import { buildGoogleFeed } from '@/lib/googleFeed';

// Google Merchant Center fetches this on a schedule (daily is right for us).
// Matches the ChatGPT feed's 15-minute revalidate so the two can never be
// serving different prices or stock for the same product.
export const revalidate = 900;
export const dynamic = 'force-static';

const PAGE = 200;
const MAX_PRODUCTS = 50000;

async function allProducts(): Promise<Product[]> {
  const out: Product[] = [];
  let offset = 0;
  for (;;) {
    // include_never_stock: same reasoning as the ChatGPT feed — the default
    // browse path hides special-order items with nothing on hand and nothing on
    // order so they do not pollute the tile wall. That is a merchandising rule
    // for a grid, not for a catalog manifest, and it was withholding 281
    // buyable products whose PDPs are live.
    const { data } = await api.getProducts({ limit: PAGE, offset, include_never_stock: 1 });
    out.push(...data);
    if (data.length < PAGE || out.length >= MAX_PRODUCTS) break;
    offset += PAGE;
  }
  return out;
}

export async function GET() {
  const body = buildGoogleFeed(await allProducts());

  return new Response(body, {
    headers: {
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Content-Disposition': 'inline; filename="flipsies-google-feed.txt"',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
}
