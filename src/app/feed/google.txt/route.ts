import { fetchAllProducts } from '@/lib/allProducts';
import { type Product } from '@/lib/api';
import { buildGoogleFeed } from '@/lib/googleFeed';

// Google Merchant Center fetches this on a schedule (daily is right for us).
// Matches the ChatGPT feed's 15-minute revalidate so the two can never be
// serving different prices or stock for the same product.
export const revalidate = 900;
export const dynamic = 'force-static';


async function allProducts(): Promise<Product[]> {
  // Paging lives in @/lib/allProducts — the local copy of this loop asked for
  // 200, got the server's clamped 100, read that as "last page" and stopped
  // after one. This feed served 94 products from 2026-08-19 until 2026-09-04.
  //
  // include_never_stock: same reasoning as the ChatGPT feed — the default
  // browse path hides special-order items with nothing on hand and nothing on
  // order so they do not pollute the tile wall. That is a merchandising rule
  // for a grid, not for a catalog manifest, and it was withholding 281
  // buyable products whose PDPs are live.
  return fetchAllProducts({ include_never_stock: 1 });
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
