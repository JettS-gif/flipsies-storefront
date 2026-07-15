// GA4 + Meta Pixel wiring. GA4 defaults to the live Flipsies Measurement ID;
// Meta fires to every configured pixel. Env overrides win, so a preview/staging
// deploy can repoint or disable either (set the env to an empty string to turn
// a channel off). Analytics IDs are public (they ship in page HTML), so
// hardcoding defaults is safe. Every helper is a no-op when its ID list is
// empty or the tag script hasn't loaded.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-YPDRKDY8VM';

// Two active pixels (two ad accounts). fbq('track') fires to EVERY initialized
// pixel, so both receive the same events. Comma-separated env override wins.
export const META_PIXEL_IDS = (
  process.env.NEXT_PUBLIC_META_PIXEL_ID || '566032973955511,1503664690977139'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

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

// Fires a pageview to GA4 and Meta on client-side (SPA) route changes. GA4
// auto-captures utm_* off the landing URL, so channel attribution needs nothing
// extra — this just covers in-app navigations the base snippets won't see.
export function pageview(path: string): void {
  if (typeof window === 'undefined') return;
  if (GA_ID && window.gtag) window.gtag('event', 'page_view', { page_path: path });
  if (META_PIXEL_IDS.length && window.fbq) window.fbq('track', 'PageView');
}

// Fires a conversion/event to GA4 (raw name) and, for mapped conversions, Meta.
// Prefer GA4's recommended names (generate_lead, begin_checkout, purchase) so
// the standard reports light up and the Meta mapping above applies.
export function trackEvent(name: string, params: GtagParams = {}): void {
  if (typeof window === 'undefined') return;
  if (GA_ID && window.gtag) window.gtag('event', name, params);

  const metaName = META_EVENT[name];
  if (META_PIXEL_IDS.length && window.fbq && metaName) {
    window.fbq('track', metaName, {
      ...(typeof params.value === 'number' ? { value: params.value } : {}),
      ...(typeof params.currency === 'string' ? { currency: params.currency } : {}),
    });
  }
}
