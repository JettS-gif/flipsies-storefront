import type { Product } from '@/lib/api';
import type { CollectionCard } from '@/components/CollectionCards';
import { pickHeroImage } from '@/lib/heroImage';

// Room browse collapses to ONE card per collection: a collection with a
// published set shows its PackageCard, and every other collection collapses
// into a synthesized CollectionCard instead of spilling its dresser /
// nightstand / chest / mirror as separate tiles. That collapse is the whole
// point of a room page.
//
// Extracted from shop/page.tsx so /shop?room=X and /shop/<room-slug> render the
// same thing — two implementations of "what is a room browse" would drift, and
// the slug route is now the canonical one we ask Google to index.

// Mirrors the server's projectPackage trailing-punctuation scrub (it derives
// "Rhett" from a "Rhett:" component) so package and product collections match.
export const normColl = (s?: string | null): string =>
  (s || '').trim().toLowerCase().replace(/[\s:·—-]+$/, '');

// Loose bed components (rails / HB-FB / drawers) sell via the bed, never as a
// standalone tile — keep them out of the room grid. They stay reachable via an
// explicit /shop/bed-parts browse.
const PART_CATEGORIES = new Set(['Bed Parts', 'Parts']);

export interface CollapsedRoom {
  /** One card per collection, alphabetical. */
  cards: CollectionCard[];
  /** Pieces with no collection — they stay as individual tiles. */
  loose: Product[];
}

export function buildCollectionCards(
  products: Product[],
  packagedCollections: Set<string>,
): CollapsedRoom {
  const groups = new Map<string, { name: string; items: Product[] }>();
  const loose: Product[] = [];

  for (const p of products) {
    if (p.category && PART_CATEGORIES.has(p.category)) continue;
    const key = normColl(p.collection);
    if (packagedCollections.has(key)) continue; // its PackageCard represents it
    if (!key) {
      loose.push(p);
      continue;
    }
    const g = groups.get(key) ?? { name: p.collection as string, items: [] };
    g.items.push(p);
    groups.set(key, g);
  }

  const cards = [...groups.values()]
    .map((g) => {
      // Search every piece's every image, not just the first piece that has one
      // — the room shot usually hangs off the sofa or the bed, not off whichever
      // piece happens to sort first.
      const image = pickHeroImage(g.items.flatMap((i) => [...(i.images ?? []), i.image_url]));
      const prices = g.items.map((i) => Number(i.retail_price)).filter((n) => n > 0);
      return {
        collection: g.name,
        image,
        fromPrice: prices.length ? Math.min(...prices) : 0,
        count: g.items.length,
        inStock: g.items.some((i) => i.in_stock),
      };
    })
    .sort((a, b) => a.collection.localeCompare(b.collection));

  return { cards, loose };
}
