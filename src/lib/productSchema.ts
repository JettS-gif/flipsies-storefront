// Helpers for the Product JSON-LD on a PDP.
//
// The existing schema was correct but thin: name, sku, image, brand, category
// and an Offer. What it lacked were the fields Google leans on to decide that
// OUR listing and a discounter's listing are the same physical product — which
// is the whole model-level comparison the storefront is trying to win.

import { todayCT, addDaysCT } from '@/lib/ct';
import { DELIVERY, RETURNS, RETURN_WINDOW_DAYS } from '@/lib/policy';

/** Inches, as schema.org QuantitativeValue expects for a UNECE unit code. */
const INCH = 'INH';

export type Dimensions = { width?: number; depth?: number; height?: number };

// Catalog values are overwhelmingly `29"W x 35"D x 39"H` (960 of 1,003), with a
// tail of partials — `58"W x 41"H`, `84"H`, `H: 84"`, `62-66"W`. Both orderings
// are handled; a range takes its upper bound, which is the space a shopper has
// to have available.
const SUFFIXED = /(\d+(?:\.\d+)?)\s*(?:["”″]|\s*in\b\.?)\s*([WDH])\b/gi;
const PREFIXED = /\b([WDH])\s*:\s*(\d+(?:\.\d+)?)/gi;

export function parseDimensions(s?: string | null): Dimensions {
  const out: Dimensions = {};
  if (!s) return out;
  const set = (axis: string, value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const key = axis.toUpperCase() === 'W' ? 'width' : axis.toUpperCase() === 'D' ? 'depth' : 'height';
    if (out[key] === undefined) out[key] = value;
  };
  for (const m of s.matchAll(SUFFIXED)) set(m[2], Number(m[1]));
  for (const m of s.matchAll(PREFIXED)) set(m[1], Number(m[2]));
  return out;
}

/** The three axes as schema.org QuantitativeValue objects, omitting blanks. */
export function dimensionSchema(s?: string | null): Record<string, unknown> {
  const d = parseDimensions(s);
  const q = (v?: number) => (v === undefined ? undefined : { '@type': 'QuantitativeValue', value: v, unitCode: INCH });
  return {
    ...(d.width !== undefined ? { width: q(d.width) } : {}),
    ...(d.depth !== undefined ? { depth: q(d.depth) } : {}),
    ...(d.height !== undefined ? { height: q(d.height) } : {}),
  };
}

/**
 * schema.org availability URL.
 *
 * Out-of-stock pieces here are made to order against a vendor's production
 * queue, not unreleased products awaiting a launch date — BackOrder describes
 * that, PreOrder does not. Affects 83 products.
 */
export function availabilityUrl(inStock: boolean): string {
  return inStock ? 'https://schema.org/InStock' : 'https://schema.org/BackOrder';
}

/**
 * `priceValidUntil` is recommended alongside an Offer, and Google may suppress
 * a rich result whose date has passed. A year out is honest for an everyday-
 * low-price catalog that does not run timed sales; it is a freshness hint, not
 * a promise, and the page revalidates long before it expires.
 *
 * Dated in Central like every other business date on the site — this renders in
 * a server component, which runs UTC on Vercel, so after 7pm CT a raw
 * `new Date()` would already be stamping tomorrow.
 */
export function priceValidUntil(from: string = todayCT()): string {
  return addDaysCT(365, from);
}

/**
 * `shippingDetails` for the Offer. Google surfaces this in Shopping, so it is a
 * published commitment rather than marketing — only what we will actually
 * stand behind goes in.
 *
 * No `shippingRate`: the fee is computed per address by the delivery engine
 * (marginal detour cost, plus overflow and Saturday surcharges), so there is no
 * single honest number to publish. Omitting it is valid; inventing a flat rate
 * would be a claim we would have to break.
 *
 * Only emitted for in-stock items — a made-to-order frame runs on the vendor's
 * production queue, and promising 2 business days on it would be false.
 */
/**
 * `hasMerchantReturnPolicy` for the Offer.
 *
 * Clearance is the one exclusion the catalog can actually express
 * (products.clearance — 347 active), so those get an explicit
 * MerchantReturnNotPermitted rather than being silently covered by a policy
 * that does not apply to them. Floor models and custom orders are the other
 * two exclusions and have NO product flag; per Jett those stay a
 * human-in-the-loop call at the counter and do not change the published
 * policy, so everything else carries the standard one.
 *
 * `ReturnInStore`: bringing it back to a showroom is free. Schema has no
 * "we collect it for a fee" option, and the pickup fee is quoted case-by-case,
 * so the free path is the one that can be stated as a fact.
 */
export function merchantReturnPolicySchema(isClearance: boolean): Record<string, unknown> {
  if (isClearance) {
    return {
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'US',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
      },
    };
  }
  return {
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'US',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: RETURN_WINDOW_DAYS,
      returnMethod: 'https://schema.org/ReturnInStore',
      returnFees: 'https://schema.org/RestockingFees',
      // A percentage, applied to every change-of-mind return — there is no
      // fee-free window to qualify this with.
      restockingFee: RETURNS.restockingFeePercent,
      refundType: 'https://schema.org/StoreCreditRefund',
    },
  };
}

export function shippingDetailsSchema(inStock: boolean): Record<string, unknown> | null {
  if (!inStock) return null;
  return {
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'US',
        addressRegion: 'AL',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        // The 2-business-day promise is end to end, so it is expressed as
        // transit time with same-day handling rather than split across both.
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: DELIVERY.inStockBusinessDays,
          unitCode: 'DAY',
        },
      },
    },
  };
}
