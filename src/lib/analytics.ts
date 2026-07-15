// GA4 + Meta Pixel wiring. GA4 defaults to the live Flipsies Measurement ID;
// the Meta Pixel is off until NEXT_PUBLIC_META_PIXEL_ID (or a baked default) is
// set. Env overrides win, so a preview/staging deploy can repoint or disable
// either. Analytics IDs are public (they ship in page HTML), so hardcoding a
// default is safe. Every helper is a no-op when its ID is empty or the tag
// script hasn't loaded.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-YPDRKDY8VM';
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

// GA4 event name → Meta Pixel standard event. Only the conversion-worthy events
// map to Meta; everything else stays GA-only.
const META_EVENT: Record<string, string> = {
  generate_lead: 'Lead',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  add_to_cart: 'AddToCart',
};

// Fires a pageview to both GA4 and Meta on client-side (SPA) route changes. GA4
// auto-captures utm_* off the landing URL, so channel attribution needs nothing
// extra — this just covers in-app navigations the base snippets won't see.
export function pageview(path: string): void {
  if (typeof window === 'undefined') return;
  if (GA_ID && window.gtag) window.gtag('event', 'page_view', { page_path: path });
  if (META_PIXEL_ID && window.fbq) window.fbq('track', 'PageView');
}

// Fires a conversion/event to GA4 (raw name) and, for mapped conversions, Meta.
// Prefer GA4's recommended names (generate_lead, begin_checkout, purchase) so
// the standard reports light up and the Meta mapping above applies.
export function trackEvent(name: string, params: GtagParams = {}): void {
  if (typeof window === 'undefined') return;
  if (GA_ID && window.gtag) window.gtag('event', name, params);

  const metaName = META_EVENT[name];
  if (META_PIXEL_ID && window.fbq && metaName) {
    window.fbq('track', metaName, {
      ...(typeof params.value === 'number' ? { value: params.value } : {}),
      ...(typeof params.currency === 'string' ? { currency: params.currency } : {}),
    });
  }
}
