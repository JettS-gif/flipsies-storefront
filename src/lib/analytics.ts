// GA4 + Meta Pixel wiring. GA4 defaults to the live Flipsies Measurement ID;
// Meta fires to every configured pixel. Env overrides win, so a preview/staging
// deploy can repoint or disable either (set the env to an empty string to turn
// a channel off). Analytics IDs are public (they ship in page HTML), so
// hardcoding defaults is safe. Every helper is a no-op when its ID list is
// empty or the tag script hasn't loaded.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-YPDRKDY8VM';

// THREE active pixels, one per ad account. fbq('track') fires to EVERY
// initialized pixel, so all three receive the same events — PageView,
// ViewContent, AddToCart, Purchase, the lot — with no per-pixel wiring.
//
// 1647344162308893 added 2026-08-04: an ad account was serving traffic against
// a pixel this site never initialised, so its campaigns had no ViewContent, no
// AddToCart and no Purchase to optimise against. Nothing was mis-attributed —
// there was simply no signal at all on that account.
//
// Splitting audiences across pixels is not ideal (Jett said as much) and the
// long-run answer is one pixel with the ad accounts sharing it. Until then,
// initialising all three is strictly better than an account flying blind, and
// costs one extra init on page load.
//
// ⚠️ THE ENV OVERRIDE WINS. If NEXT_PUBLIC_META_PIXEL_ID is set in Vercel, this
// default is dead code and the new id must be added THERE too. As of 2026-08-04
// the live site initialises exactly the two ids below, so either the var is
// unset or it matches — verified by fetching the rendered homepage, not assumed.
export const META_PIXEL_IDS = (
  process.env.NEXT_PUBLIC_META_PIXEL_ID
  || '566032973955511,1503664690977139,1647344162308893'
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

// GA4 event name → Meta Pixel standard event.
//
// view_item → ViewContent was MISSING until 2026-08-03, and it is the one that
// costs money: ViewContent is what Meta builds a "looked at a product, didn't
// buy" retargeting audience from, and dynamic/catalog ads cannot run without
// it. Product views were reaching GA4 and stopping there, so every conversion
// campaign was optimising against cart/purchase alone — far too sparse on
// furniture volume, the same handicap events.ts describes for add_to_cart.
//
// view_item_list is deliberately NOT mapped. "ViewCategory" is not in Meta's
// standard event list (it survives only in older DPA docs), so sending it
// registers as a custom event that no standard optimisation reads — noise on
// every listing page for no gain.
const META_EVENT: Record<string, string> = {
  view_item: 'ViewContent',
  search: 'Search',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  generate_lead: 'Lead',
};

type GaItem = { item_id?: string; quantity?: number };

// Meta's ecommerce parameters are not GA4's. Meta matches a catalog on
// content_ids, so an event without them can only be counted — it cannot drive
// a product-view audience, dynamic ads, or product-level ROAS. Derived from the
// GA4 items array rather than making every call site pass a second shape.
// Returns {} when there are no usable ids so the spread stays a no-op.
function metaContentParams(params: GtagParams): Record<string, unknown> {
  const items = Array.isArray(params.items) ? (params.items as GaItem[]) : [];
  const withIds = items.filter((i) => i && typeof i.item_id === 'string' && i.item_id);
  if (!withIds.length) return {};
  return {
    content_type: 'product',
    content_ids: withIds.map((i) => i.item_id),
    contents: withIds.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1 })),
  };
}

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
      // GA4 calls it search_term, Meta calls it search_string; same value.
      ...(typeof params.search_term === 'string' ? { search_string: params.search_term } : {}),
      ...metaContentParams(params),
    });
  }
}
