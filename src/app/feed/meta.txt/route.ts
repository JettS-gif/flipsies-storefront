import { fetchAllProducts } from '@/lib/allProducts';
import { api } from '@/lib/api';
import { buildMetaFeed } from '@/lib/metaFeed';

// Meta Commerce Manager fetches this on a schedule (daily). Same revalidate as
// the Google feed so the two never serve different prices for one product.
export const revalidate = 900;
export const dynamic = 'force-static';

export async function GET() {
  // No labels means empty product sets, which would quietly stop every catalog
  // ad. A failed fetch must NOT publish that: answer non-200 so Meta keeps the
  // last good copy and reports the failed fetch instead.
  let labels: Record<string, string[]>;
  try {
    labels = (await api.getAdLabels()).labels;
  } catch {
    return new Response('ad labels unavailable\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const body = buildMetaFeed(await fetchAllProducts({ include_never_stock: 1 }), labels);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Content-Disposition': 'inline; filename="flipsies-meta-feed.txt"',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
}
