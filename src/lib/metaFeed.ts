// Product feed for the Meta (Facebook/Instagram) catalog.
//
// Meta reads the Google Merchant Center column names, so this is the Google
// feed row plus three custom labels — one serializer for price, availability
// and copy, never two that can disagree. The labels come from the backend
// (/storefront/ad-labels, DeliverDeskBackEnd/utils/adLabels.js) and drive the
// product sets of the always-on catalog campaign:
//
//   custom_label_0 = new_arrival   received in the last 21 days
//   custom_label_1 = best_seller   top models by orders, last 60 days
//   custom_label_2 = deal          clearance (final units)
//
// No sale_price / compare-at column: no strike-through prices online (Jett,
// 2026-08-05), and a Meta ad is online.

import type { Product } from '@/lib/api';
import { GOOGLE_FEED_COLUMNS, googleRow } from '@/lib/googleFeed';
import { isFeedEligible } from '@/lib/productFeed';

const SEP = '\t';

export const META_LABEL_COLUMNS = ['custom_label_0', 'custom_label_1', 'custom_label_2'] as const;
const LABEL_FOR_COLUMN = ['new_arrival', 'best_seller', 'deal'] as const;

export type AdLabels = Record<string, string[]>;

/** The three label cells for one product, in META_LABEL_COLUMNS order. */
export function labelCells(p: Product, labels: AdLabels): string[] {
  const mine = new Set(labels[p.id] || []);
  return LABEL_FOR_COLUMN.map((l) => (mine.has(l) ? l : ''));
}

export function buildMetaFeed(products: Product[], labels: AdLabels): string {
  const lines = [[...GOOGLE_FEED_COLUMNS, ...META_LABEL_COLUMNS].join(SEP)];
  for (const p of products) {
    if (!isFeedEligible(p)) continue;
    lines.push([googleRow(p), ...labelCells(p, labels)].join(SEP));
  }
  return lines.join('\n') + '\n';
}
