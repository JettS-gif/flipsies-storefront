// ── Storefront packages ─────────────────────────────────────────────────────
//
// A package is a bundle of products sold at one group price (bedroom suite,
// table + 4 chairs). The grid merchandises a collection as ONE package card
// instead of five near-identical piece tiles — same play as the sectional
// family cards, one level up.
//
// Only packages that carry a real vendor price break are published (Jett's
// rule); the backend gates on is_published AND status='active', so anything
// this returns is already meant to be seen. Structural packages — bed = HB/FB
// + rail, so a multi-SKU item sells as one line — stay unpublished and never
// reach here.
//
// The endpoint never returns cost or unit counts; components carry an
// `in_stock` boolean only. Mirrors the /storefront/products contract.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app';

export interface PackageItem {
  id: string;
  sku: string;
  name: string;
  collection: string | null;
  room: string | null;
  category: string | null;
  type: string | null;
  retail_price: number | null;
  images: string[] | null;
  qty: number;
  in_stock: boolean;
}

export interface StorefrontPackage {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  images: string[];
  /** Sum of component retail x qty — computed server-side, never stored. */
  compare_at_price: number;
  /** compare_at_price - price, floored at 0. */
  savings: number;
  /** Badge for the card; derived from the components' collection. */
  collection: string | null;
  room: string | null;
  category: string | null;
  /** True only when EVERY component can be covered. */
  in_stock: boolean;
  item_count: number;
  items: PackageItem[];
}

export interface PackageQuery {
  search?: string;
  collection?: string;
  room?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch published packages. Revalidates on the same 60s cadence as products
 * (lib/api.ts) so a price or publish flip shows up within the minute.
 */
export async function fetchPackages(q: PackageQuery = {}): Promise<StorefrontPackage[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const res = await fetch(`${API_BASE}/storefront/packages${qs.toString() ? `?${qs}` : ''}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.data as StorefrontPackage[]) || [];
}

export async function fetchPackage(id: string): Promise<StorefrontPackage | null> {
  const res = await fetch(`${API_BASE}/storefront/packages/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return (await res.json()) as StorefrontPackage;
}
