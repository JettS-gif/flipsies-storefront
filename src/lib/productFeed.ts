// Product feed for ChatGPT Shopping (OpenAI's merchant feed spec).
//
// This is the same catalog the PDP already publishes as Product JSON-LD, in the
// one other format that matters now: ChatGPT does NOT discover products by
// crawling: it ingests a merchant feed. Everything here therefore mirrors
// lib/productSchema.ts rather than restating it — where a fact is already
// published as a schema.org commitment (return window, availability, shipping
// region), the feed must say the same thing or we are making two different
// promises about one product.
//
// The feed is DISCOVERY-ONLY (`is_eligible_checkout: false`). Instant Checkout
// needs an OpenAI payment-handler integration that cannot be built before we
// are an approved merchant, so shoppers come to us and we own the checkout.
// Flipping it later is this one flag plus that integration.

import type { Product } from '@/lib/api';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import { productTitle } from '@/lib/productTitle';
import { publicDescription } from '@/lib/publicDescription';
import { parseDimensions } from '@/lib/productSchema';
import { RETURN_WINDOW_DAYS, RETURNS } from '@/lib/policy';

// Tab-delimited rather than CSV. Furniture copy is full of commas and inch
// marks ('58"W, tufted'), and every CSV quoting bug we would have to get right
// simply cannot occur in a format whose delimiter never appears in the data —
// see `clean()`, which strips tabs outright.
const SEP = '\t';

// Spec field caps. Enforced by truncation rather than by dropping the row: a
// title one character over is still a good listing, and a silently missing
// product is worse than a shortened title.
const CAP = {
  title: 150,
  description: 5000,
  brand: 70,
  seller_name: 70,
  material: 100,
  color: 40,
  size: 20,
  mpn: 70,
} as const;

/**
 * Feed-safe scalar. Tabs and newlines would break the row apart, and the spec
 * wants plain text — so control characters go, and the field is collapsed to
 * single spaces.
 */
export function clean(v: unknown, cap?: number): string {
  if (v === null || v === undefined) return '';
  // Control characters (tab and newline among them) become spaces, then runs of
  // whitespace collapse, so no field can ever split a row or a column.
  // eslint-disable-next-line no-control-regex
  const s = String(v)
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cap && s.length > cap) return s.slice(0, cap - 1).trimEnd() + '…';
  return s;
}

/**
 * Feed availability.
 *
 * Mirrors availabilityUrl() in productSchema, with one distinction the schema
 * form cannot express. An out-of-stock piece is normally BackOrder — it is
 * built against the vendor's production queue, not awaiting a launch. But a
 * `clearance` product is a vendor-exited line we are selling through and CANNOT
 * reorder, so once it is gone it is genuinely gone. Calling that `backorder`
 * would promise a restock that will never arrive.
 */
export function feedAvailability(p: Pick<Product, 'in_stock' | 'clearance'>): string {
  if (p.in_stock) return 'in_stock';
  return p.clearance ? 'out_of_stock' : 'backorder';
}

/**
 * The colourways (or sizes) this listing stands for, as the spec's variant_dict.
 *
 * We submit ONE listing per model rather than one per colourway: furniture
 * queries are model-level ("a power reclining sofa", not "the Wynn Blue one"),
 * the grid's representative is already chosen to prefer in-stock AND imaged, and
 * nine near-duplicate rows would compete with each other rather than multiply
 * our reach.
 *
 * The cost of collapsing is that the listing claims `listing_has_variations`
 * and then never says WHAT varies — so a shopper asking "does it come in grey?"
 * gets no answer from a row that could have given one. This closes that: the
 * siblings are already on the record.
 *
 * `variant_axis` decides the key, because the same field means different things
 * by vendor — colourway groups (Jofran/Fusion) vs mattress size groups (MLily).
 */
export function variantDict(p: Product): string {
  const axis = p.variant_axis === 'size' ? 'size' : 'color';
  // `variant_colors` is the collapsed view's window-aggregated sibling list and
  // the only source available here: the LIST endpoint carries variant_count but
  // not the sibling rows, which exist solely on the single-product endpoint, and
  // the feed cannot afford a per-product fetch across ~2,500 products. It
  // arrives with duplicates (a colourway can span several sizes) because
  // Postgres has no DISTINCT for window functions — deduped below.
  // `variants` is preferred when present, so a single-product caller still works.
  const fromSiblings = (p.variants ?? []).map((v) => (axis === 'size' ? v.size : v.color));
  const source = fromSiblings.length ? fromSiblings : (p.variant_colors ?? []);
  const values = source.map((v) => clean(v)).filter(Boolean);

  const unique = [...new Set(values)];
  if (unique.length < 2) return '';
  // JSON, since the spec types this field as an object. Capped: a 40-colourway
  // fabric library would otherwise dwarf every other cell on the row.
  return JSON.stringify({ [axis]: unique.slice(0, 25) });
}

/**
 * The GTIN, but only if it really is one.
 *
 * A GTIN is 8, 12, 13 or 14 digits — nothing else is a GTIN, and a value that
 * merely looks like an identifier is actively harmful here: unlike a missing
 * field, a malformed or wrong-length one asserts a specific product identity to
 * every shopping surface that reads the feed, and it will be matched against
 * somebody else's listing. Silence is the honest answer when we cannot prove it.
 *
 * `mpn` still carries the vendor part number regardless, so model-level matching
 * does not depend on this.
 */
export function validGtin(upc?: string | null): string {
  // Whitespace is trimmed, but separators are NOT stripped, and that is the
  // load-bearing part. Stripping them MANUFACTURES GTINs out of hyphenated part
  // numbers: Southern Motion's "101-113-14" collapses to "10111314", which is
  // eight digits and therefore a structurally valid GTIN-8 belonging to somebody
  // else entirely. A UPC is stored digits-only (see products.upc), so anything
  // carrying punctuation is a SKU that reached the wrong column.
  const raw = String(upc ?? '').trim();
  return /^(\d{8}|\d{12,14})$/.test(raw) ? raw : '';
}

/** Absolute URL for an image path that may already be absolute. */
export function absUrl(u: string): string {
  return u.startsWith('http') ? u : `${SITE_URL}${u}`;
}

/**
 * The feed description.
 *
 * Deliberately NOT productMetaDescription(): that is budgeted to Google's
 * ~160-character SERP truncation, while the feed allows 5,000 and the model
 * reads the whole thing to decide whether we answer the shopper's question.
 * Real vendor copy leads when we have it; otherwise the structured fields are
 * composed into prose.
 *
 * The delivery sentence is not marketing — it is the single most important fact
 * about buying furniture from us, and the feed is a NATIONAL surface. A shopper
 * in Oregon should learn we are an Alabama delivery business from the listing,
 * not after filling a cart. Matches the addressRegion: 'AL' already published
 * in shippingDetailsSchema().
 */
export function feedDescription(p: Product): string {
  const parts: string[] = [];
  const real = publicDescription(p.description);
  parts.push(real || productTitle(p));

  if (p.dimensions) parts.push(`Dimensions: ${p.dimensions}.`);
  if (p.size) parts.push(`Size: ${p.size}.`);
  if (p.material) parts.push(`Material: ${p.material}.`);

  parts.push(
    p.in_stock
      ? 'In stock now.'
      : p.clearance
        ? 'Final units — this line has been discontinued by the vendor and will not be restocked.'
        : 'Made to order.',
  );
  parts.push(
    `Local delivery throughout the Birmingham, Alabama area; in-store pickup at our Hoover and Irondale showrooms. ${RETURN_WINDOW_DAYS}-day returns (${RETURNS.restockingFeePercent}% restocking fee on opened items).`,
  );

  return clean(parts.join(' '), CAP.description);
}

/** Columns, in emit order. The header row must match this exactly. */
export const FEED_COLUMNS = [
  'item_id',
  'title',
  'description',
  'url',
  'image_url',
  'additional_image_urls',
  'brand',
  'price',
  'availability',
  'condition',
  'product_category',
  'material',
  'color',
  'size',
  'gtin',
  'mpn',
  'length',
  'width',
  'height',
  'dimensions_unit',
  'group_id',
  'listing_has_variations',
  'variant_dict',
  'seller_name',
  'seller_url',
  'seller_privacy_policy',
  'seller_tos',
  'return_policy',
  'accepts_returns',
  'return_deadline_in_days',
  'target_countries',
  'store_country',
  'is_eligible_search',
  'is_eligible_checkout',
] as const;

/**
 * Whether a product may enter the feed at all.
 *
 * Price and image are spec-required, so a row missing either is rejected at
 * ingest anyway — filtering here keeps the feed's error report meaningful
 * instead of burying real problems under known-bad rows. The imageless rule
 * also matches sitemap.ts, which withdraws those PDPs from crawling for the
 * same reason: a listing with no photo cannot convert.
 */
export function isFeedEligible(p: Product): boolean {
  const hasImage = Boolean(p.images?.length || p.image_url);
  return hasImage && Number(p.retail_price) > 0;
}

/** One TSV row, ordered to FEED_COLUMNS. */
export function feedRow(p: Product): string {
  const images = (p.images?.length ? p.images : p.image_url ? [p.image_url] : []).map(absUrl);
  const dims = parseDimensions(p.dimensions);
  const variantCount = p.variant_count ?? 1;

  const cells: Record<(typeof FEED_COLUMNS)[number], string> = {
    item_id: clean(p.id),
    title: clean(productTitle(p), CAP.title),
    description: feedDescription(p),
    url: `${SITE_URL}/product/${p.id}`,
    image_url: clean(images[0]),
    // Spec takes these comma-separated. Cap at 9 so one product with a large
    // gallery cannot dominate the row.
    additional_image_urls: images.slice(1, 10).join(','),
    brand: clean(p.vendor?.name, CAP.brand),
    // ISO 4217 is required alongside the number.
    price: `${Number(p.retail_price).toFixed(2)} USD`,
    availability: feedAvailability(p),
    condition: 'new',
    // '>' is the spec's hierarchy separator.
    product_category: clean([p.room, p.category].filter(Boolean).join(' > ')),
    material: clean(p.material, CAP.material),
    color: clean(p.color, CAP.color),
    size: clean(p.size, CAP.size),
    gtin: validGtin(p.upc),
    mpn: clean(p.sku, CAP.mpn),
    // Spec orders these L x W x H; our free-text dimensions parse to
    // width/depth/height, and depth IS length.
    length: dims.depth !== undefined ? String(dims.depth) : '',
    width: dims.width !== undefined ? String(dims.width) : '',
    height: dims.height !== undefined ? String(dims.height) : '',
    dimensions_unit: dims.width !== undefined || dims.depth !== undefined || dims.height !== undefined ? 'in' : '',
    group_id: clean(p.variant_group_id),
    listing_has_variations: variantCount > 1 ? 'true' : 'false',
    variant_dict: variantDict(p),
    seller_name: clean(SITE_NAME, CAP.seller_name),
    seller_url: SITE_URL,
    seller_privacy_policy: `${SITE_URL}/privacy`,
    seller_tos: `${SITE_URL}/terms`,
    return_policy: `${SITE_URL}/returns`,
    // Clearance is excluded from returns entirely — the same carve-out
    // merchantReturnPolicySchema() publishes as MerchantReturnNotPermitted.
    accepts_returns: p.clearance ? 'false' : 'true',
    return_deadline_in_days: p.clearance ? '' : String(RETURN_WINDOW_DAYS),
    target_countries: 'US',
    store_country: 'US',
    is_eligible_search: 'true',
    is_eligible_checkout: 'false',
  };

  return FEED_COLUMNS.map((c) => cells[c]).join(SEP);
}

/** The complete feed document: header row plus one row per eligible product. */
export function buildFeed(products: Product[]): string {
  const lines = [FEED_COLUMNS.join(SEP)];
  for (const p of products) {
    if (!isFeedEligible(p)) continue;
    lines.push(feedRow(p));
  }
  return lines.join('\n') + '\n';
}
