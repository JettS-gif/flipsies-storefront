'use client';

import { useEffect, useRef } from 'react';
import { track, type SiteEventType } from '@/lib/siteEvents';

// Fire-once beacon for a server-rendered page.
//
// Product and shop pages are async Server Components, so they cannot call the
// browser-side beacon themselves. They render this instead and pass the facts
// they already have — which is the point: the SERVER knows the search result
// count, and results_count = 0 is the single most valuable signal in the whole
// system. Recomputing it client-side would mean a second query and a chance to
// disagree with what the customer was actually shown.
//
// Renders nothing.

interface Props {
  type: SiteEventType;
  productId?: string | null;
  sku?: string | null;
  query?: string | null;
  resultsCount?: number | null;
}

export default function TrackEvent({ type, productId, sku, query, resultsCount }: Props) {
  // React Strict Mode double-invokes effects in development, and a remount on
  // the same content would double-count. Key the guard on the CONTENT, not on a
  // bare boolean: navigating from one product to the next reuses this component
  // instance, and a boolean would suppress every view after the first.
  const fired = useRef<string | null>(null);

  useEffect(() => {
    const key = [type, productId, sku, query, resultsCount].join('|');
    if (fired.current === key) return;
    fired.current = key;

    track({
      event_type: type,
      product_id: productId ?? null,
      sku: sku ?? null,
      search_query: query ?? null,
      // Deliberately `?? null` and NOT `|| null`: zero is the value that
      // matters most here, and a falsy check would erase every no-results
      // search — the exact rows the dashboard exists to surface.
      results_count: resultsCount ?? null,
    });
  }, [type, productId, sku, query, resultsCount]);

  return null;
}
