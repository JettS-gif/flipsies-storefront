// One place that fans a commerce event out to all three destinations:
// GA4, the Meta pixels, and our own site_events table.
//
// WHY A FAÇADE. Before this, GA4 (lib/analytics.ts) and first-party
// (lib/siteEvents.ts) were called separately at separate sites. That guarantees
// drift: someone adds a hook to one and not the other, and six months later two
// dashboards disagree and nobody can say which is lying. Every call site below
// fires exactly once and reaches everything.
//
// WHAT THIS FIXES. The storefront was sending GA4 only three events —
// purchase, begin_checkout, generate_lead — so the entire top of the funnel was
// missing. Consequences, all real:
//   * GA4's item reports were empty: no way to see which products get looked at
//     versus bought.
//   * There was no view → cart → purchase funnel at all.
//   * analytics.ts already MAPS add_to_cart to Meta's AddToCart, but nothing
//     ever called it, so that mapping was dead code. Meta optimises on the
//     events it receives; on furniture volume purchases are too sparse to
//     optimise against, and AddToCart is the mid-funnel signal that fixes it.
//     That was a live handicap on the ad spend.
//
// GA4 ecommerce parameter names are NOT ours to choose — item_id, item_name,
// price, quantity, currency, value are what the standard reports read. Get them
// wrong and the events arrive but the reports stay empty, which looks identical
// to not sending them.

import { trackEvent } from './analytics';
import { track } from './siteEvents';

export interface CommerceItem {
  product_id?: string | null;
  sku?: string | null;
  name?: string | null;
  price?: number | null;
  qty?: number | null;
  category?: string | null;
}

// GA4 wants item_id to be the thing you'd recognise in a report. SKU first —
// it is what staff and vendors actually say — falling back to the uuid.
function toGaItem(i: CommerceItem) {
  return {
    item_id:       i.sku || i.product_id || undefined,
    item_name:     i.name || undefined,
    price:         typeof i.price === 'number' ? i.price : undefined,
    quantity:      i.qty ?? 1,
    item_category: i.category || undefined,
  };
}

const valueOf = (items: CommerceItem[]) =>
  items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.qty ?? 1), 0);

/** Product detail page view. GA4 `view_item` — powers the item reports. */
export function productViewed(item: CommerceItem): void {
  trackEvent('view_item', {
    currency: 'USD',
    value:    (Number(item.price) || 0) * (item.qty ?? 1),
    items:    [toGaItem(item)],
  });
  track({
    event_type: 'product_view',
    product_id: item.product_id ?? null,
    sku:        item.sku ?? null,
  });
}

/**
 * Added to cart. The mid-funnel signal Meta needs — see the note above.
 * Mapped to Meta AddToCart by analytics.ts META_EVENT.
 */
export function addedToCart(item: CommerceItem): void {
  trackEvent('add_to_cart', {
    currency: 'USD',
    value:    (Number(item.price) || 0) * (item.qty ?? 1),
    items:    [toGaItem(item)],
  });
  track({
    event_type: 'add_to_cart',
    product_id: item.product_id ?? null,
    sku:        item.sku ?? null,
    payload:    { price: item.price ?? null, qty: item.qty ?? 1 },
  });
}

/**
 * A search. GA4's reserved parameter is `search_term` — anything else and the
 * built-in search report stays blank.
 *
 * resultsCount is passed through to first-party ONLY: GA4 has no standard
 * parameter for it, and zero-result searches are the thing our own table exists
 * to capture. `?? null` not `|| null` so a genuine 0 survives.
 */
export function searched(term: string, resultsCount?: number | null): void {
  if (!term) return;
  trackEvent('search', { search_term: term });
  track({
    event_type:    'search',
    search_query:  term,
    results_count: resultsCount ?? null,
  });
}

/** A product listing was shown. GA4 `view_item_list`. */
export function itemListViewed(listName: string, items: CommerceItem[]): void {
  if (!items.length) return;
  trackEvent('view_item_list', {
    item_list_name: listName,
    items: items.slice(0, 20).map(toGaItem), // GA4 caps payload size; 20 is plenty for a report
  });
}

/**
 * Purchase. GA4 already fires this from the checkout's redirect-survival
 * stash, so this adds ONLY the first-party half — double-firing GA4 would
 * double-count revenue, which is the one number nobody forgives being wrong.
 */
export function purchased(invoiceNumber: string, total: number, itemCount: number): void {
  track({
    event_type: 'purchase',
    payload:    { invoice_number: invoiceNumber, value: total, item_count: itemCount },
  });
}
