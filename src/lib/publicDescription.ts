// `products.description` is not reliably customer-facing copy.
//
// Staff used it as the only free-text field on the product record during two
// physical inventory counts — a Pelham warehouse count over Dec 2024–Jan 2025
// ("PELHAM - 12/11/24: Section 1, Row 2 (4)", "Counted 1/7 Row 4") and a
// separate shelf count ("Backstock Located on Shelf 5A - PC"). 177 of the 585
// products that have a description carry one of those notes, and the PDP
// trusted the field unconditionally: they rendered in the page body, the
// <meta name="description">, the og:description, AND the Product JSON-LD that
// feeds Google's rich results. That leaks warehouse layout and unit counts into
// the SERP.
//
// The notes are also dead data — stock location moved to bins, and showroom
// presence is derived server-side from bin quantities (`on_display_at`).
// Nulling the 177 rows is a DeliverDesk-side cleanup; this guard makes the
// storefront stop publishing them immediately, and keeps working if the habit
// comes back on the next count.
//
// Length is the discriminator, not the keywords alone. Measured across the full
// 2,309-product catalog: every note is under 74 characters and every piece of
// real marketing copy is 120+, so the gate has wide margin and produces ZERO
// false positives. Keywords alone would not — "Hoover" and "Irondale" are real
// showroom names that belong in genuine copy, and a bare date pattern would
// have suppressed the legitimate description "CHAIR 1/2".
const LOCATION_NOTE =
  /pelham|irondale|hoover|backstock|\brow\s*\d|\bsec(tion)?\s*\d|\bshelf\s*\d|\bwh\d?\b|warehouse|end of aisle|counted|aisle/i;

// No real description in the catalog is shorter than this; no internal note is
// longer than 73 characters.
const NOTE_MAX_LENGTH = 120;

// The same scratch-field habit on `storefront_packages.description`, but far
// worse than a bin location: 13 of 24 published packages carry the WHOLESALE
// COST and the vendor's price break ("Set cost 489.95 vs a-la-carte 559.95
// (CM break $70)"), and one carries a repricing instruction. Every one of them
// renders in the package page body and in its Product JSON-LD.
//
// Deliberately NOT length-gated: the reprice note runs past 120 characters, and
// unlike a showroom name none of these phrases has an innocent reading — a
// retailer never publishes its own cost, and "multi-SKU" is system jargon.
const INTERNAL_PRICING = /\bset cost\b|\bbreak \$|\bcm break\b|\brepric(e|ed|ing)\b|multi-?sku/i;

/**
 * The description if it is safe to publish, else null.
 *
 * Returns null rather than '' so callers can fall through to a generated
 * description with a plain `??`. Apply this to a product or package
 * `description` ONLY — never to page copy, which legitimately names the
 * showrooms.
 */
export function publicDescription(d?: string | null): string | null {
  const t = d?.trim();
  if (!t) return null;
  if (INTERNAL_PRICING.test(t)) return null;
  if (t.length < NOTE_MAX_LENGTH && LOCATION_NOTE.test(t)) return null;
  return t;
}
