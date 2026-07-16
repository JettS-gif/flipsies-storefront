// Shared filter contract for /shop. Every filter is a URL param so a filtered
// view is shareable, back-button-able and server-rendered — no client state.

export type ShopSearchParams = {
  search?: string;
  room?: string;
  brand?: string;
  collection?: string;
  color_family?: string;
  price_min?: string;
  price_max?: string;
  availability?: string;
  sort?: string;
};

export type FacetOption = { value: string; count: number; label?: string };
export type Facets = {
  total: number;
  brands: FacetOption[];
  rooms: FacetOption[];
  colorFamilies: FacetOption[];
  availability: FacetOption[];
  price: { min: number; max: number };
};

// Price buckets sized to the real distribution (median $399.97, p90 $1049.97) —
// even-thirds buckets would pile ~70% of the catalog into the first one.
export const PRICE_BUCKETS = [
  { label: 'Under $250',       min: undefined, max: '250' },
  { label: '$250 – $500',      min: '250',     max: '500' },
  { label: '$500 – $1,000',    min: '500',     max: '1000' },
  { label: '$1,000 – $2,000',  min: '1000',    max: '2000' },
  { label: '$2,000 & up',      min: '2000',    max: undefined },
] as const;

export const SORTS = [
  { value: '',           label: 'Featured' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest',     label: 'Newest' },
] as const;

/** The params that count as "filtering" — drives the canonical + Clear all. */
export const FILTER_KEYS: (keyof ShopSearchParams)[] = [
  'room', 'brand', 'collection', 'color_family', 'price_min', 'price_max', 'availability', 'sort',
];

export function activeFilterCount(sp: ShopSearchParams): number {
  // price_min+price_max are one choice to a shopper, so count the pair once.
  const keys = FILTER_KEYS.filter(k => k !== 'price_max');
  return keys.filter(k => sp[k]).length;
}

/**
 * Build an /shop href with `patch` applied over the current params.
 * A null value removes the key — that's how a filter toggles itself off.
 */
export function buildHref(sp: ShopSearchParams, patch: Partial<Record<keyof ShopSearchParams, string | undefined | null>>): string {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) if (v) next[k] = String(v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') delete next[k];
    else next[k] = String(v);
  }
  const qs = new URLSearchParams(next).toString();
  return qs ? `/shop?${qs}` : '/shop';
}
