// GA4 wiring. Defaults to the live Flipsies Measurement ID; an env override
// (NEXT_PUBLIC_GA_ID) still wins, so a preview/staging deploy can point at a
// separate property or disable it. Every helper below is a no-op when the ID
// is empty or gtag hasn't loaded. GA IDs are public (they ship in page HTML),
// so hardcoding the default is safe.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-YPDRKDY8VM';

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// GA4 auto-captures utm_* off the landing URL on the first page_view, so
// channel/campaign attribution needs no extra work here — this just covers
// client-side (SPA) route changes the base snippet won't see.
export function pageview(path: string): void {
  if (!GA_ID || typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'page_view', { page_path: path });
}

// Fire a GA4 conversion/event. Prefer GA4's recommended event names
// (generate_lead, begin_checkout, purchase) where one fits so the standard
// reports light up without custom config. Safe no-op without gtag.
export function trackEvent(name: string, params: GtagParams = {}): void {
  if (!GA_ID || typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}
