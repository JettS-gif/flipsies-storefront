'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pageview } from '@/lib/analytics';

// Fires a GA4 page_view on client-side (SPA) route changes. The initial
// load's page_view — including any utm_* params on the landing URL — is sent
// by the base gtag snippet's default send_page_view; this covers subsequent
// in-app navigations. Deliberately uses usePathname only (NOT useSearchParams)
// so it needs no Suspense boundary and doesn't opt the tree into dynamic
// rendering. UTM lives on the landing URL and is captured at first load, so
// dropping query strings on later navigations costs no attribution.
export default function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    pageview(pathname);
  }, [pathname]);
  return null;
}
