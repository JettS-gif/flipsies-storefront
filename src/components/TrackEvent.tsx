'use client';

import { useEffect, useRef } from 'react';
import { productViewed, searched } from '@/lib/events';

// Fire-once beacon for a server-rendered page.
//
// Product and shop pages are async Server Components, so they cannot call the
// browser-side trackers themselves. They render this instead and pass the facts
// they already have — which is the point: the SERVER knows the search result
// count, and results_count = 0 is the single most valuable signal we collect.
// Recomputing it client-side would mean a second query and a chance to disagree
// with what the customer was actually shown.
//
// Goes through lib/events.ts so GA4, the Meta pixels and our own table all fire
// from ONE call and cannot drift apart.
//
// Renders nothing.

interface Props {
  type: 'product_view' | 'search';
  productId?: string | null;
  sku?: string | null;
  name?: string | null;
  price?: number | null;
  category?: string | null;
  query?: string | null;
  resultsCount?: number | null;
}

export default function TrackEvent({
  type, productId, sku, name, price, category, query, resultsCount,
}: Props) {
  // React Strict Mode double-invokes effects in development, and a remount on
  // the same content would double-count. Key the guard on the CONTENT, not on a
  // bare boolean: navigating from one product to the next reuses this component
  // instance, and a boolean would suppress every view after the first.
  const fired = useRef<string | null>(null);

  useEffect(() => {
    const key = [type, productId, sku, query, resultsCount].join('|');
    if (fired.current === key) return;
    fired.current = key;

    if (type === 'product_view') {
      productViewed({ product_id: productId, sku, name, price, category, qty: 1 });
    } else if (type === 'search' && query) {
      // `?? null` not `|| null` — a genuine 0 is the row that matters most.
      searched(query, resultsCount ?? null);
    }
  }, [type, productId, sku, name, price, category, query, resultsCount]);

  return null;
}
