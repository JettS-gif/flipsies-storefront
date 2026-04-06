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

// ── Public API (no auth required) ───────────────────────────────

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
  cost: number;
  qty_on_hand: number;
  inventory_status: string;
  vendor_id: string | null;
  vendor?: { name: string };
  attributes: string | null;
  sectional_piece_type: string | null;
  sectional_family: string | null;
  image_url?: string | null;
  images?: string[];
  description?: string | null;
  dimensions?: string | null;
  created_at: string;
}

export interface ProductsResponse {
  data: Product[];
  count: number;
}

export const api = {
  // Products — public browsing (uses a public endpoint we'll add)
  getProducts: (params: Record<string, string | number> = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
    });
    return request<ProductsResponse>('GET', `/products?${p}`, undefined, {
      next: { revalidate: 60 },
    });
  },

  getProduct: (id: string) =>
    request<Product>('GET', `/products/${id}`, undefined, {
      next: { revalidate: 60 },
    }),

  getProductBySku: (sku: string) =>
    request<Product>('GET', `/products/scan/${encodeURIComponent(sku)}`, undefined, {
      next: { revalidate: 60 },
    }),

  // Categories — derived from products
  getCategories: () =>
    request<{ categories: string[] }>('GET', '/products/categories', undefined, {
      next: { revalidate: 300 },
    }),
};
