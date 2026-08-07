// Google LOCAL product inventory feed.
//
// The online feed (googleFeed.ts) says "we sell this". THIS one says "it is on
// the floor in Irondale, four miles away" — which for furniture is the highest
// intent thing we can put in front of someone. "I want to sit on it first" is
// the single biggest objection to buying a sofa, and 428 of our first 1,073
// orders were collected in person rather than delivered.
//
// It is a SUPPLEMENTAL feed: `id` must match a row already in the online feed,
// and Google joins them. Title, price, description and images all come from
// there, so this file carries only what is store-specific.
//
// WHERE THE DATA COMES FROM. /storefront/showroom-inventory, which reads
// product_locations for bins at a location of type='showroom' with qty > 0.
// Jett's rule (2026-08-02): "if it's binned at either showroom it is out of box
// on display." That endpoint uses the PER-SKU lookup, not the group-aware one
// the browse badge uses — a badge may light up because a sibling colourway is on
// the floor, which is fine for "this model is viewable" and false for a listing
// that names one product to someone about to drive over.
//
// NO QUANTITY, deliberately. utils/showroomAvailability.js settled this: a
// shopper cares whether they can come and sit on one, not that there are two,
// and a count that moves hourly invites arguments. Google's local feed accepts
// availability without quantity.

import type { Product } from '@/lib/api';
import { SHOWROOMS } from '@/lib/site';
import { clean } from '@/lib/productFeed';

const SEP = '\t';

export const LOCAL_FEED_COLUMNS = [
  'store_code',
  'id',
  'availability',
  'pickup_method',
  'pickup_sla',
] as const;

/** A showroom row from /storefront/showroom-inventory. */
export interface ShowroomInventoryRow {
  product_id: string;
  location_id: string;
  location_name: string;
}

/**
 * Match a DeliverDesk location name to its Google store code.
 *
 * The backend sends the warehouse-side name ("Irondale Showroom"); SHOWROOMS
 * holds the customer-facing entry. Matched on slug rather than string equality
 * for the same reason SeeItInPerson does it — renaming a location in
 * DeliverDesk must not silently empty the feed.
 *
 * Returns null for a showroom with no linked Business Profile, which is how
 * Hoover stays out until its Business Manager conflict is resolved. Emitting a
 * row with no store code would be rejected; emitting one under the WRONG store
 * code would send people to the wrong building.
 */
export function storeCodeFor(locationName: string): string | null {
  const n = String(locationName || '').toLowerCase();
  // The slug alone is NOT enough. "Irondale Warehouse" contains "irondale" and
  // would otherwise be handed the Irondale SHOWROOM's code — advertising
  // warehouse stock as floor stock and sending someone to the wrong building.
  // The endpoint only serves type='showroom' today, but the cost of that
  // changing is a customer driving somewhere the sofa is not.
  if (!n.includes('showroom')) return null;
  const s = SHOWROOMS.find((x) => n.includes(x.slug));
  return s?.googleStoreCode ?? null;
}

/**
 * One row per (product, store) pair.
 *
 * `pickup_method: 'buy'` is a real claim, not aspirational — the storefront
 * genuinely supports buy-online-collect-in-store (checkoutReadiness's pickup
 * path needs a store and a date), and it is how 40% of orders already complete.
 * Claiming it without the flow existing would be a promise broken at the door.
 */
export function localRow(productId: string, storeCode: string): string {
  const cells: Record<(typeof LOCAL_FEED_COLUMNS)[number], string> = {
    store_code: clean(storeCode),
    id: clean(productId),
    // Binned on a showroom floor with qty > 0. Reserved units count: a sold
    // floor model keeps standing there with a SOLD tag, and someone who drives
    // out to try the model has had a successful trip.
    availability: 'in_stock',
    pickup_method: 'buy',
    // Same-day: it is already on the floor, not being shipped to the store.
    pickup_sla: 'same_day',
  };
  return LOCAL_FEED_COLUMNS.map((c) => cells[c]).join(SEP);
}

/**
 * The complete local feed.
 *
 * `eligibleIds` is the set of products the ONLINE feed publishes. A local row
 * whose id is absent there is orphaned — Google has nothing to join it to — so
 * filtering here keeps the error report about real problems instead of burying
 * them under rows that could never have matched.
 */
export function buildLocalFeed(rows: ShowroomInventoryRow[], eligibleIds: Set<string>): string {
  const lines = [LOCAL_FEED_COLUMNS.join(SEP)];
  const seen = new Set<string>();
  for (const r of rows) {
    const code = storeCodeFor(r.location_name);
    if (!code) continue;
    if (!eligibleIds.has(r.product_id)) continue;
    // A product can occupy several bins in one showroom; Google wants one row
    // per product per store.
    const key = `${code}:${r.product_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(localRow(r.product_id, code));
  }
  return lines.join('\n') + '\n';
}
