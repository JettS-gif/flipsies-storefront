'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pageview } from '@/lib/analytics';
import { track } from '@/lib/siteEvents';

// Fires a GA4 page_view on client-side (SPA) route changes. The initial
// load's page_view — including any utm_* params on the landing URL — is sent
// by the base gtag snippet's default send_page_view; this covers subsequent
// in-app navigations. Deliberately uses usePathname only (NOT useSearchParams)
// so it needs no Suspense boundary and doesn't opt the tree into dynamic
// rendering. UTM lives on the landing URL and is captured at first load, so
// dropping query strings on later navigations costs no attribution.
//
// The first-party beacon rides the SAME effect rather than getting its own
// hook, so the two can never disagree about what counted as a page view — one
// signal, two destinations. It also means the first-party record covers the
// initial load, which GA4 gets from the gtag snippet instead.
//
// NOT onRouterTransitionStart (instrumentation-client.ts): that fires when a
// navigation BEGINS, and a navigation can be aborted or redirected. usePathname
// settles after the route commits, which is what a page view actually is.
export default function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    pageview(pathname);
    track({ event_type: 'page_view', path: pathname });
  }, [pathname]);
  return null;
}
