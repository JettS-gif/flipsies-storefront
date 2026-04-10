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
};

// ── Check Availability response shapes ─────────────────────────────────
// The backend returns one of four discriminated variants. Frontend code
// should switch on `status` before reading variant-specific fields.

export interface AvailableSlot {
  date: string;             // YYYY-MM-DD
  time_label: string;       // "10:00 AM"
  time_mins: number;        // 600 for 10:00 AM
  price: number;            // delivery fee for this slot
  proximity_label: string;  // "Within 15 min" | "Open day" | etc.
  driver_name?: string;
}

export type CheckAvailabilityResponse =
  | { status: 'in_range'; slots: AvailableSlot[]; lead_hours: number }
  | { status: 'out_of_range'; distance_miles: number; store_phone: string; message: string }
  | { status: 'geocode_failed'; message: string }
  | { status: 'unavailable'; message: string; store_phone?: string };
