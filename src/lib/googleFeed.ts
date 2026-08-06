// Product feed for Google Merchant Center.
//
// Same catalog and the same eligibility rule as lib/productFeed.ts (the ChatGPT
// feed) — only the field NAMES and a few semantics differ. Deliberately a thin
// second serializer over shared primitives rather than a fork: the two feeds
// must never disagree about a product's price, availability or return terms,
// because both are published commitments and a shopper can see both.
//
// Google matters more than the row count suggests. It feeds Shopping, free
// listings, AI Overviews and Gemini — which for "sofa near Birmingham" is
// almost certainly a larger surface today than ChatGPT Shopping.
//
// SHIPPING IS NOT IN THIS FILE, on purpose. Google takes shipping from
// ACCOUNT-level settings, and ours is a flat rate bound to a 50-mile radius
// region around the Hoover showroom — a per-row `shipping` attribute would have
// to restate that on 2,500 rows and would silently override the account rule if
// it ever drifted. The delivery fee is marginal detour cost, not a per-item
// rate, so there is nothing product-specific to say.

import type { Product } from '@/lib/api';
import { SITE_URL } from '@/lib/site';
import { productTitle } from '@/lib/productTitle';
import { parseDimensions } from '@/lib/productSchema';
import { clean, absUrl, feedAvailability, feedDescription, validGtin, isFeedEligible } from '@/lib/productFeed';

const SEP = '\t';

// Google's caps. Same truncate-don't-drop policy as the ChatGPT feed: a long
// title is a worse listing, a missing product is no listing.
const CAP = {
  title: 150,
  description: 5000,
  brand: 70,
  color: 100,
  size: 100,
  material: 200,
  mpn: 70,
  product_type: 750,
} as const;

/**
 * Columns, in emit order. Google reads the header row, so names are exact.
 *
 * `shipping` is absent — see the file header. `google_product_category` is also
 * absent: Google infers it, and a WRONG category is worse than none because it
 * decides which queries the product competes in. Populating it properly means
 * mapping our 130-odd categories onto Google's taxonomy, which is real work and
 * a guess would quietly mis-file the catalog.
 */
export const GOOGLE_FEED_COLUMNS = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'additional_image_link',
  'availability',
  'price',
  'brand',
  'gtin',
  'mpn',
  'condition',
  'product_type',
  'item_group_id',
  'color',
  'size',
  'material',
  'product_length',
  'product_width',
  'product_height',
] as const;

/** One TSV row, ordered to GOOGLE_FEED_COLUMNS. */
export function googleRow(p: Product): string {
  const images = (p.images?.length ? p.images : p.image_url ? [p.image_url] : []).map(absUrl);
  const dims = parseDimensions(p.dimensions);
  // Google wants the unit inline on dimension attributes ("35 in"), unlike the
  // ChatGPT spec which carries a separate dimensions_unit column.
  const inches = (v?: number) => (v === undefined ? '' : `${v} in`);

  const cells: Record<(typeof GOOGLE_FEED_COLUMNS)[number], string> = {
    id: clean(p.id),
    title: clean(productTitle(p), CAP.title),
    description: clean(feedDescription(p), CAP.description),
    link: `${SITE_URL}/product/${p.id}`,
    image_link: clean(images[0]),
    // Google takes up to 10 extras, comma-separated.
    additional_image_link: images.slice(1, 11).join(','),
    availability: feedAvailability(p),
    price: `${Number(p.retail_price).toFixed(2)} USD`,
    brand: clean(p.vendor?.name, CAP.brand),
    gtin: validGtin(p.upc),
    mpn: clean(p.sku, CAP.mpn),
    condition: 'new',
    // Our OWN taxonomy, which Google explicitly wants as free text and uses as
    // a ranking signal. Distinct from google_product_category.
    product_type: clean([p.room, p.category, p.type].filter(Boolean).join(' > '), CAP.product_type),
    // Groups colourways of one model. Google expects EVERY variant to carry it,
    // and our feed submits the collapsed representative, so this mostly tells
    // Google the row stands for a group rather than joining siblings together.
    item_group_id: clean(p.variant_group_id),
    color: clean(p.color, CAP.color),
    size: clean(p.size, CAP.size),
    material: clean(p.material, CAP.material),
    // Parsed from free text; blanks are omitted rather than guessed. Google's
    // `product_length` is the depth axis, matching how the PDP schema maps it.
    product_length: inches(dims.depth),
    product_width: inches(dims.width),
    product_height: inches(dims.height),
  };

  return GOOGLE_FEED_COLUMNS.map((c) => cells[c]).join(SEP);
}

/**
 * The complete feed document.
 *
 * NOTE on `identifier_exists`: it is deliberately NOT emitted. It belongs on
 * products that genuinely have no manufacturer identifier at all — vintage,
 * handmade, one-off. Every row here carries brand + mpn (the vendor's own part
 * number), which IS a valid identifier pair, so declaring `no` would be false
 * and would forfeit the model-level matching that mpn exists to win.
 */
export function buildGoogleFeed(products: Product[]): string {
  const lines = [GOOGLE_FEED_COLUMNS.join(SEP)];
  for (const p of products) {
    if (!isFeedEligible(p)) continue;
    lines.push(googleRow(p));
  }
  return lines.join('\n') + '\n';
}
