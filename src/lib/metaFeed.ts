// Product feed for the Meta (Facebook/Instagram) catalog.
//
// Meta reads the Google Merchant Center column names, so this is the Google
// feed row plus one `internal_label` column — one serializer for price,
// availability and copy, never two that can disagree. The labels come from the
// backend (/storefront/ad-labels, DeliverDeskBackEnd/utils/adLabels.js) and
// drive the product sets of the always-on catalog campaign:
//
//   new_arrival   received in the last 21 days
//   best_seller   top models by orders, last 60 days
//   deal          clearance (final units)
//
// internal_label, not custom_label_N: Meta re-reviews an ad for policy every
// time a custom label changes, and these change daily. internal_label is for
// exactly that — set filtering without a review. Format is Meta's list syntax:
// ['new_arrival','deal'].
//
// No sale_price / compare-at column: no strike-through prices online (Jett,
// 2026-08-05), and a Meta ad is online.

import type { Product } from '@/lib/api';
import { GOOGLE_FEED_COLUMNS, googleRow } from '@/lib/googleFeed';
import { isFeedEligible } from '@/lib/productFeed';

const SEP = '\t';
const KNOWN_LABELS = new Set(['new_arrival', 'best_seller', 'deal']);

export const META_EXTRA_COLUMNS = ['internal_label'] as const;

export type AdLabels = Record<string, string[]>;

/** The internal_label cell for one product: `['a','b']`, or empty. */
export function labelCell(p: Product, labels: AdLabels): string {
  const mine = (labels[p.id] || []).filter((l) => KNOWN_LABELS.has(l));
  return mine.length ? `[${mine.map((l) => `'${l}'`).join(',')}]` : '';
}

const ID_COL = GOOGLE_FEED_COLUMNS.indexOf('id');
const MPN_COL = GOOGLE_FEED_COLUMNS.indexOf('mpn');

/**
 * One Meta row. `id` is the SKU, not the product UUID the Google feed uses: the
 * pixel reports content_ids as the SKU (events.ts toGaItem), and Meta joins a
 * ViewContent / AddToCart to a catalog item ONLY by exact id. With UUIDs every
 * retargeting ad would have nothing to show the person who viewed the product.
 *
 * Meta compares ids case-insensitively and rejects BOTH rows of a collision
 * (seen live: df4672 / Df4672, two different products). `taken` holds the
 * lower-cased ids already emitted; a later collider falls back to its UUID —
 * it loses pixel matching, not its place in the catalog.
 */
export function metaRow(p: Product, labels: AdLabels, taken: Set<string> = new Set()): string {
  const cells = googleRow(p).split(SEP);
  const sku = cells[MPN_COL];
  if (sku && !taken.has(sku.toLowerCase())) cells[ID_COL] = sku;
  taken.add(cells[ID_COL].toLowerCase());
  return [...cells, labelCell(p, labels)].join(SEP);
}

export function buildMetaFeed(products: Product[], labels: AdLabels): string {
  const lines = [[...GOOGLE_FEED_COLUMNS, ...META_EXTRA_COLUMNS].join(SEP)];
  const taken = new Set<string>();
  for (const p of products) {
    if (!isFeedEligible(p)) continue;
    lines.push(metaRow(p, labels, taken));
  }
  return lines.join('\n') + '\n';
}
