import type { Facets } from '@/lib/shopFilters';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app';

// Filter-panel options + counts. The backend caches these (5 min) because the
// underlying read is a full pass over published rows; we revalidate on the same
// order so the panel isn't the thing that hammers it.
export async function fetchFacets(): Promise<Facets | null> {
  try {
    const res = await fetch(`${API_BASE}/storefront/facets`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as Facets;
  } catch {
    return null;   // panel just doesn't render — the grid still works
  }
}
