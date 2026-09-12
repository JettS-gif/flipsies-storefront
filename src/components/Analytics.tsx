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

  // Phone taps (2026-09-12). ONE delegated listener rather than an onClick on
  // each `tel:` link: there are four such links today (contact, sectionals,
  // track-order, the sectional wizard) and the fifth will be added by someone
  // who has never read this file. A listener that finds them by href cannot be
  // forgotten; four handlers can.
  //
  // WHY IT MATTERS. /contact has no form — it is a card with two phone numbers —
  // so a visitor who wants to talk leaves no trace at all. Measured over 90
  // days: 53 visitors reached it, ONE ever produced a lead, and one became a
  // $1,145.99 sale we could only attribute by hand. Every other capture point
  // is transactional; this is the first that records intent to TALK.
  //
  // Capture phase, because a click on the <a> is followed immediately by the OS
  // handing off to the dialer and this listener must run before the page can be
  // torn down. track() uses sendBeacon, which is built to survive exactly that.
  //
  // closest(), not e.target: the tap usually lands on a <span> inside the link.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest('a[href^="tel:"]') : null;
      if (!el) return;
      const number = (el.getAttribute('href') || '').replace(/^tel:/i, '').trim();
      track({
        event_type: 'contact_click',
        path: window.location.pathname,
        // Which number they dialled distinguishes the two showrooms, and the
        // label says which surface earned the call. Neither is a customer
        // identifier — nothing here is personal data.
        payload: { number, label: (el.textContent || '').trim().slice(0, 80) },
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
