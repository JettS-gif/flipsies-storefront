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
  qty_on_hand: number;
  inventory_status: string;
  vendor?: { name: string };
  attributes?: string | null;
  sectional_piece_type: string | null;
  sectional_family: string | null;
  images?: string[] | null;
  /** Computed from images[0] — not a DB column */
  image_url?: string | null;
  description?: string | null;
  dimensions?: string | null;
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
};

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
