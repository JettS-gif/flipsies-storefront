const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app';

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
  vendor?: { name: string };
  attributes?: string | null;
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
  checkAvailability: (address: string) =>
    request<CheckAvailabilityResponse>(
      'GET',
      `/storefront/check-availability?address=${encodeURIComponent(address)}`,
      undefined,
      { cache: 'no-store' },
    ),

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
      payload,
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
  time_label: string;       // "10:00 AM"
  time_mins: number;        // 600 for 10:00 AM
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
  | { status: 'unavailable'; message: string; store_phone?: string };

// Response shape from POST /storefront/leads. The backend returns the
// newly-created lead id plus the same four-way availability union so
// the widget only needs one roundtrip to show the result.
export interface LeadCaptureResponse {
  lead_id: string | null;  // null if the insert failed but availability still computed
  availability: CheckAvailabilityResponse;
}
