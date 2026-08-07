import { api, type Product } from '@/lib/api';
import { buildLocalFeed, type ShowroomInventoryRow } from '@/lib/localFeed';
import { isFeedEligible } from '@/lib/productFeed';

// Floor stock moves during a trading day, and this feed's whole promise is
// "it is here right now". 15 minutes matches the other feeds and Google's own
// accepted refresh cadence.
export const revalidate = 900;
export const dynamic = 'force-static';

const PAGE = 200;
const MAX_PRODUCTS = 50000;

/**
 * The ids the ONLINE feed publishes.
 *
 * A local row is supplemental — Google joins it to an online row by id, so a
 * local row with no counterpart is orphaned. Reusing isFeedEligible rather than
 * restating the rule keeps the two feeds from disagreeing about what is
 * publishable.
 */
async function eligibleProductIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;
  for (;;) {
    const { data } = await api.getProducts({ limit: PAGE, offset, include_never_stock: 1 });
    for (const p of data as Product[]) if (isFeedEligible(p)) ids.add(p.id);
    if (data.length < PAGE || ids.size >= MAX_PRODUCTS) break;
    offset += PAGE;
  }
  return ids;
}

export async function GET() {
  const [inventory, eligible] = await Promise.all([
    api.getShowroomInventory(),
    eligibleProductIds(),
  ]);

  const body = buildLocalFeed(inventory.data as ShowroomInventoryRow[], eligible);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Content-Disposition': 'inline; filename="flipsies-local-inventory.txt"',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
}
