import { visitorId, sessionId } from './siteEvents';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app';

/**
 * First-party attribution for a browser-originated POST.
 *
 * Returns {} on the server. This module is imported by server components
 * (shop/page.tsx renders with getProducts), and visitorId() reads localStorage
 * inside a try/catch — so a server-side call does NOT throw, it silently mints a
 * brand-new id. That would post a visitor who never browsed anything and poison
 * the very join this exists to enable. No field beats a fabricated one.
 */
function browserAttribution(): { visitor_id?: string; session_id?: string } {
  if (typeof window === 'undefined') return {};
  try {
    return { visitor_id: visitorId(), session_id: sessionId() };
  } catch {
    return {}; // analytics must never break a lead submission
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

async function request<T = unknown>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: opts.cache,
    next: opts.next,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw err;
  }

  return res.json();
}

// ── Public Storefront API (no auth required) ────────────────────

export interface ProductVariant {
  id: string;
  color: string | null;
  size: string | null;
  in_stock: boolean;
  image_url: string | null;
  retail_price: number;
}

/**
 * An orderable fabric from the vendor's swatch library (Chairs America). Not a
 * product row — the SKU is minted at checkout. `price` is resolved server-side
 * off the frame's grade→price map; `in_stock` is true when a stocked colorway
 * on this frame already carries the fabric.
 */
/** One colour within a fabric line, with a verified isolated swatch + facets. */
export interface FabricColor {
  id: string;
  code: string | null;
  name: string;
  swatch_image_url: string | null;
  hex: string | null;
  color_family: string | null;   // Neutral buckets / Blue / Green / Red-Rust / …
  pattern_type: string | null;   // Solid / Textured / Patterned
  in_stock: boolean;
  /** Real floor photo of THIS frame in this colour, when we've shot one (joined
   *  on fabric_code). Preview shows it instead of the swatch tile. */
  product_image_url?: string | null;
}

export interface Fabric {
  id: string;
  name: string;
  grade: string | null;
  content: string | null;
  swatch_image_url: string | null;
  price: number | null;
  in_stock: boolean;
  /** Verified per-colour swatches for this line (feeds the faceted picker). */
  colors?: FabricColor[];
}

/**
 * A reclining mechanism a Southern Motion model comes in (rocker, wall-hugger,
 * power headrest, swivel…). Each is a real priced frame row. `from_price` is the
 * base (Fabric-grade) price; `route_id` is a live PDP to link to when the
 * mechanism is stocked, else null (made-to-order). `description` is the
 * customer-facing "what it does" blurb.
 */
export interface Mechanism {
  id: string;
  sku: string;
  label: string;
  key: string;
  description: string | null;
  from_price: number | null;
  grade_prices: Record<string, number> | null;
  image_url: string | null;
  in_stock: boolean;
  is_current: boolean;
  made_to_order: boolean;
  route_id: string | null;
}

export interface Product {
  id: string;
  sku: string;
  /**
   * The vendor's printed GTIN/UPC, digits only. Null for most of the catalog
   * and that is normal — it records the ones we can prove, it does not assert
   * that a product without one is incomplete. Emitted as `gtin` in the product
   * feed and the PDP's Product JSON-LD, both of which validate it first: a
   * malformed GTIN identifies the WRONG product to every shopping surface that
   * reads it, which is worse than sending none.
   */
  upc?: string | null;
  name: string;
  collection: string | null;
  color: string | null;
  material: string | null;
  material_class: string | null;
  type: string | null;
  category: string | null;
  room: string | null;
  retail_price: number;
  compare_at_price: number | null;
  in_stock: boolean;
  /**
   * Vendor-exited sell-through item: still selling from on-hand stock but not
   * reorderable. Drives the /deals Clearance rail + a "Final Units" card badge;
   * suppresses the "Special Order" badge (it can't be special-ordered).
   */
  clearance?: boolean;
  vendor?: { name: string };
  attributes?: string | null;
  /**
   * The dimension shoppers actually search on for flat goods — "8' x 10'" on a
   * rug, a mattress size. Distinct from `dimensions`, which is the free-text
   * W/D/H string on box furniture; a rug has no meaningful depth. Populated on
   * 37 of the 122 Surya products and every mattress. The product feed emits it
   * as `size`, which is the field ChatGPT Shopping matches a "9x12 rug" query
   * against.
   */
  size?: string | null;
  sectional_piece_type: string | null;
  sectional_family: string | null;
  images?: string[] | null;
  /** Computed from images[0] — not a DB column */
  image_url?: string | null;
  description?: string | null;
  dimensions?: string | null;
  variant_group_id?: string | null;
  /**
   * Which attribute distinguishes this product's variant siblings — 'color' for
   * colorway groups (Jofran/Fusion), 'size' for mattress size groups (MLily).
   * The selector labels + a size group skips the swatch row (photos are
   * identical across sizes). Defaults to 'color' server-side.
   */
  variant_axis?: 'color' | 'size';
  /**
   * How many published colourways this tile stands for. Only meaningful on the
   * collapsed browse grid, where one tile represents the whole variant group;
   * the endpoint defaults it to 1 on search/colour-filtered paths, which
   * already render one tile per colourway.
   */
  variant_count?: number;
  /**
   * Full fabric library this frame can be ordered in (Chairs America, Southern
   * Motion, …) — the "orderable" side of the badge's "X in stock · Y orderable"
   * split. Null/absent for products that aren't ordered in a fabric library.
   */
  orderable_count?: number | null;
  /**
   * Showrooms where this piece is out of box on the floor — derived server-side
   * from bin data (qty > 0 at a location of type='showroom'). Reserved units
   * count: a sold floor model keeps standing there with a SOLD tag and is still
   * viewable. Empty means it is on no floor, and the PDP block renders nothing
   * rather than announcing "not available to view".
   */
  on_display_at?: Array<{ id: string; name: string }>;
  /**
   * Set only when THIS colourway is on no floor but the model is: other
   * colourways that are, so the PDP can say "try it in Fig, order yours"
   * instead of going silent under a group-level badge on the browse card.
   */
  on_display_siblings?: Array<{ id: string; label: string; showrooms: Array<{ id: string; name: string }> }>;
  /** Sibling color/finish variants (same variant_group_id OR frame parent), in-stock first. */
  variants?: ProductVariant[];
  /** Orderable fabric library for fabric-graded frames (Chairs America). */
  fabrics?: Fabric[];
  /**
   * Reclining mechanisms this model comes in (Southern Motion) — the "how it
   * moves" menu. Each is a priced frame the shopper can choose; in-stock ones
   * link to a live PDP (route_id), made-to-order ones show priced-from with a
   * description of what the mechanism does. Absent for products with only one
   * mechanism or vendors that don't sell by mechanism.
   */
  mechanisms?: Mechanism[];
  /** Frame's grade→price map: { "1": 699.97, ... }. Drives per-fabric pricing. */
  grade_prices?: Record<string, number> | null;
  /** Production lead window for made-to-order frames. */
  lead?: { min_weeks: number | null; max_weeks: number | null } | null;
}

/** Ensure product has image_url derived from images array */
function hydrateProduct(p: Product): Product {
  return { ...p, image_url: p.image_url ?? p.images?.[0] ?? null };
}

export interface ProductsResponse {
  data: Product[];
  count: number;
}

export interface CategoriesResponse {
  categories: string[];
  rooms: string[];
}

/**
 * A better phrasing for a search that returned nothing, with the count it would
 * have found. `suggestion: null` is a real answer, not a failure — it means we
 * genuinely do not carry the thing, which is the unmet-demand signal the
 * website panel exists to collect.
 *
 * `via` says which mechanism got there: a curated customer-word→our-word map, a
 * trigram spelling fix, or both.
 */
export interface SearchSuggestion {
  suggestion: string | null;
  via?: 'synonym' | 'spelling' | 'synonym+spelling' | 'fuzzy-synonym';
  count?: number;
}

/** How many results still counts as "thin" — a shelf too sparse to be an answer.
 *  Measured, not picked: the nine synonym-mapped terms that currently return
 *  something return 1, 1, 1, 2, 3, 3, 5, 5 and 16. Five sits in the wide gap
 *  before that 16 ("coffee table", already a real shelf at 16 hits). */
export const THIN_RESULT_MAX = 5;

export const api = {
  getProducts: async (params: Record<string, string | number> = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
    });
    const res = await request<ProductsResponse>('GET', `/storefront/products?${p}`, undefined, {
      next: { revalidate: 60 },
    });
    return { ...res, data: res.data.map(hydrateProduct) };
  },

  getProduct: async (id: string) => {
    const p = await request<Product>('GET', `/storefront/products/${id}`, undefined, {
      next: { revalidate: 60 },
    });
    return hydrateProduct(p);
  },

  getProductBySku: async (sku: string) => {
    const p = await request<Product>('GET', `/storefront/products/scan/${encodeURIComponent(sku)}`, undefined, {
      next: { revalidate: 60 },
    });
    return hydrateProduct(p);
  },

  /**
   * Anonymous QR scan tracking. Fires from server components (the
   * /scan/[sku] page right before redirecting to the product detail).
   * Forwards the original user-agent and x-forwarded-for so the
   * backend can record the actual scanner's IP, not the Next.js
   * server's IP. Backend rate-limits to 5 / 15min / IP.
   *
   * Customer hint fields (name/phone/email) are null on first scan
   * and may be backfilled later if the same scanner identifies
   * themselves on a checkout / lead form. The DeliverDesk office can
   * then join scan_events on customer_phone / customer_email to
   * reconstruct the scanner's interest history.
   */
  logScanEvent: (
    payload: {
      sku: string;
      product_id?: string | null;
      mode?: string | null;
      customer_name?: string | null;
      customer_phone?: string | null;
      customer_email?: string | null;
      payload?: Record<string, unknown> | null;
    },
    forwardHeaders?: { userAgent?: string | null; ip?: string | null },
  ) =>
    request<{ ok: boolean }>('POST', '/scan-events', { ...payload, source: 'storefront' }, {
      cache: 'no-store',
      headers: {
        ...(forwardHeaders?.userAgent ? { 'user-agent': forwardHeaders.userAgent } : {}),
        ...(forwardHeaders?.ip        ? { 'x-forwarded-for': forwardHeaders.ip }   : {}),
      },
    }),

  getCategories: () =>
    request<CategoriesResponse>('GET', '/storefront/categories', undefined, {
      next: { revalidate: 300 },
    }),

  /**
   * Did-you-mean for a search that already came back empty. Call it ONLY on
   * that path — the endpoint is deliberately separate from /storefront/products
   * so a working query is never silently reshuffled.
   *
   * Swallows its own errors on purpose. This is an enhancement to a page that
   * has already failed to find anything; a suggestion lookup must not turn a
   * disappointing search into a broken one. Cached like the other slow-moving
   * catalog vocabulary — the answer for a given term changes only when the
   * synonym map or the catalog does.
   */
  getSearchSuggestion: async (term: string, opts: { thin?: boolean } = {}): Promise<SearchSuggestion> => {
    try {
      return await request<SearchSuggestion>(
        'GET',
        `/storefront/search-suggest?q=${encodeURIComponent(term)}${opts.thin ? '&thin=1' : ''}`,
        undefined,
        { next: { revalidate: 300 } },
      );
    } catch {
      return { suggestion: null };
    }
  },

  getTaxRate: (city?: string) =>
    request<{ rate: number; jurisdiction: string }>('GET', `/storefront/tax-rate${city ? '?city=' + encodeURIComponent(city) : ''}`, undefined, {
      cache: 'no-store',
    }),

  /**
   * Check delivery availability for an address. Wraps the DeliverDesk
   * scheduling engine's driver-capacity-aware slot generator with the
   * storefront-specific 48h lead time and 50mi gate already applied.
   * Never caches — real-time driver capacity matters.
   */
  /**
   * `productIds` is optional. Supplying the cart's product ids lets the backend
   * answer `delivery_on_arrival` for a made-to-order cart instead of offering
   * slots we cannot honour. Stock is read server-side, not taken from the cart
   * line, because an item can become a special order between add-to-cart and
   * checkout. Omitting it preserves the old address-only behaviour (the
   * home-page delivery widget still calls it that way).
   */
  /**
   * `fabricPairs` is `<product_id>:<fabric_id>` for each line the fabric wizard
   * configured, and is what makes the made-to-order answer correct. product_ids
   * alone points at the FRAME, whose stock belongs to whatever colourway we
   * happen to hold — so a customer configuring a different fabric was told the
   * item was in stock and offered dated slots for a chair that has to be built
   * (found 2026-07-31). The backend resolves the fabric's child product
   * read-only and reads ITS stock. Omitting this keeps the old behaviour.
   */
  checkAvailability: (address: string, productIds?: string[], fabricPairs?: string[]) => {
    const qs = new URLSearchParams({ address });
    if (productIds?.length) qs.set('product_ids', productIds.join(','));
    if (fabricPairs?.length) qs.set('fabric_pairs', fabricPairs.join(','));
    return request<CheckAvailabilityResponse>(
      'GET',
      `/storefront/check-availability?${qs.toString()}`,
      undefined,
      { cache: 'no-store' },
    );
  },

  /**
   * Capture a storefront lead AND run availability in a single call.
   * Used by the home-page "Check Delivery" widget. The backend persists
   * the lead for office follow-up (even out-of-range ones, so the team
   * can arrange white-glove delivery) and returns the same availability
   * shape as checkAvailability plus the new lead_id for the frontend
   * to echo in success messaging.
   */
  createLead: (payload: {
    name:    string;
    email?:  string;
    phone?:  string;
    address: string;
    source?: string;
  }) =>
    request<LeadCaptureResponse>(
      'POST',
      '/storefront/leads',
      // Attach the visit that produced this lead, so the Leads panel can expand
      // a row into what they looked at and whether they reached checkout.
      // Attached HERE rather than at each form so a future lead surface cannot
      // forget it and quietly become unattributable.
      //
      // Guarded on `window` because this module is imported by SERVER components
      // too (shop/page.tsx calls getProducts during render). visitorId() reads
      // localStorage inside a try/catch, so a server call would not throw — it
      // would silently MINT a fresh id and post a visitor that never existed.
      // Omitting the field server-side is the honest answer.
      { ...payload, ...browserAttribution() },
      { cache: 'no-store' },
    ),

  /**
   * Marketing-list signup. Lands in the same storefront_leads table as
   * createLead above, distinguished by `source` and by carrying a
   * marketing_status — so the office works one surface, not two.
   *
   * `sms_opt_in` is a separate flag on purpose and must only ever be true
   * because the visitor ticked a box that said so. Marketing texts need express
   * written consent, which typing an email address is not.
   *
   * UTM params are read from the URL by the caller rather than here: this
   * module is imported by server components, where there is no location to read.
   */
  subscribe: (payload: {
    email: string;
    name?: string;
    phone?: string;
    sms_opt_in?: boolean;
    source?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }) =>
    request<{ ok: true; lead_id?: string; already_subscribed?: boolean }>(
      'POST',
      '/storefront/subscribe',
      { ...payload, ...browserAttribution() },
      { cache: 'no-store' },
    ),

  /**
   * Abandoned-checkout lead. Fired when the shopper finishes the CONTACT step
   * and moves toward payment — before an invoice exists, because the invoice
   * only appears at the Stripe step and most people who leave, leave earlier.
   *
   * NOT a marketing signup: no consent is given by buying something, so this
   * writes no marketing_status. See POST /storefront/checkout-lead.
   *
   * Callers MUST treat this as fire-and-forget. Nothing here may ever delay or
   * block a checkout — a lost lead costs a phone call, a blocked checkout costs
   * the sale.
   */
  captureCheckoutLead: (payload: { name?: string; email: string; phone?: string }) =>
    request<{ ok: true; lead_id?: string; repeat?: boolean }>(
      'POST',
      '/storefront/checkout-lead',
      { ...payload, ...browserAttribution() },
      { cache: 'no-store' },
    ),

  /**
   * Self-service order tracking. Returns 404 on either an unknown
   * invoice_number OR an email mismatch — the storefront page treats
   * both as the same "couldn't find your order" UX.
   */
  trackOrder: (invoice: string, email: string) =>
    request<TrackOrderResponse>(
      'GET',
      `/storefront/track-order?invoice=${encodeURIComponent(invoice)}&email=${encodeURIComponent(email)}`,
      undefined,
      { cache: 'no-store' },
    ),
};

export interface TrackOrderItem {
  sku:                string;
  name:               string;
  qty:                number;
  fulfillment_status: string;
  needs_po:           boolean;
}

export interface TrackOrderResponse {
  invoice_number: string;
  status:         string;
  customer_name:  string;
  delivery_mode:  string | null;
  delivery_date:  string | null;
  delivery_time:  string | null;
  total:          number;
  amount_paid:    number;
  items:          TrackOrderItem[];
}

// ── Check Availability response shapes ─────────────────────────────────
// The backend returns one of four discriminated variants. Frontend code
// should switch on `status` before reading variant-specific fields.

export interface AvailableSlot {
  date: string;             // YYYY-MM-DD
  /**
   * The CONCRETE slot we actually commit to — "12:15 PM". This is what goes
   * back as `time_window` on the order and what the dispatch board places the
   * stop at, so the crew keeps 15-minute precision. Show `hour_label` instead.
   */
  time_label: string;
  time_mins: number;        // 735 for 12:15 PM
  /**
   * The customer-facing promise — "12:00 PM – 1:00 PM" (2026-08-01). The
   * backend rolls its 15-minute grid up into hour windows for this endpoint;
   * see DeliverDeskBackEnd/utils/slotRollup.js. Optional so an older backend
   * (or a non-rolled caller) still type-checks — render `hour_label ??
   * time_label`.
   */
  hour_label?: string;
  hour_mins?: number;       // 720 for the 12:00 PM – 1:00 PM window
  price: number;            // delivery fee for this slot (base + surcharges)
  proximity_label: string;  // "Within 15 min" | "Open day" | etc.
  driver_name?: string;
  /** Saturday convenience fee already baked into `price`. 0 on weekdays. */
  saturday_surcharge?: number;
}

export type CheckAvailabilityResponse =
  | { status: 'in_range'; slots: AvailableSlot[]; lead_hours: number }
  | { status: 'out_of_range'; distance_miles: number; store_phone: string; message: string }
  | { status: 'geocode_failed'; message: string }
  | { status: 'unavailable'; message: string; store_phone?: string }
  /**
   * The cart holds a made-to-order / special-order line, so there is no slot to
   * pick: the item is on a 6-8 week vendor lead and the picker only ever covers
   * the next 2-3 weeks. The customer orders now and we quote + bill delivery
   * when it lands. Returned only when product_ids are supplied.
   *
   * `mixed` = the cart ALSO holds in-stock lines. That case is deliberately a
   * phone call rather than an automated rule: splitting into two deliveries
   * means two trips and two fees, holding for one trip means waiting on stock
   * the customer could have had, and which is right depends on the items, the
   * distance, and what they'd rather do. `in_stock_items` is populated only
   * when mixed.
   */
  | { status: 'delivery_on_arrival'; message: string; store_phone?: string;
      mixed: boolean;
      special_orders: Array<{ sku: string; name: string }>;
      in_stock_items: Array<{ sku: string; name: string }> };

// Response shape from POST /storefront/leads. The backend returns the
// newly-created lead id plus the same four-way availability union so
// the widget only needs one roundtrip to show the result.
export interface LeadCaptureResponse {
  lead_id: string | null;  // null if the insert failed but availability still computed
  availability: CheckAvailabilityResponse;
}
