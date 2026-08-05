// The single place that turns a /shop/<segment> URL into a room or a category.
//
// Two URL vocabularies had collided here. The route matched raw DB category
// names, so real links were %20-encoded and mixed case (/shop/Accent%20Cabinet),
// while every room link in the nav slugified a label (/shop/living-room) and
// matched no category at all — rendering an empty HTTP 200 instead of products.
// Both the homepage tiles and the sitewide footer pointed at that second
// vocabulary, as did every legacy old-site 308 in next.config.ts, so the whole
// domain migration was landing on empty pages.
//
// Resolution now runs through here, which also gives the route something it
// never had: a way to know a segment resolves to NOTHING, so it can 404 instead
// of becoming an unbounded space of crawlable empty pages.

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Slugs that name a ROOM rather than a category. Rooms come from
// /storefront/categories -> rooms[]. Three room names also exist as category
// names; the winner is whichever holds the inventory a shopper following that
// link expects (counts measured against production 2026-08-05):
//
//   living-room   room 941 vs category   1  -> room
//   outdoor       room  16 vs category  12  -> room (the room is the superset)
//   rug           room   1 vs category  66  -> CATEGORY, so `rug` is absent here
//
// "Storage + Display" is a room with 0 published products — deliberately absent
// so it 404s rather than rendering an empty page.
export const ROOM_SLUGS: Record<string, string> = {
  'living-room': 'Living Room',
  bedroom: 'Bedroom',
  'dining-room': 'Dining Room',
  mattresses: 'Mattresses',
  office: 'Office',
  // The nav says "Home Office"; the DB room is "Office". Canonicalises to /shop/office.
  'home-office': 'Office',
  outdoor: 'Outdoor',
  accessories: 'Accessories',
};

// /shop/sectionals and /shop/deals are owned by other routes, and /shop/Sectional
// is a category that redirects to the builder. Those four live in next.config.ts
// rather than here on purpose: there is a loading.tsx above this segment, so the
// route streams, and once streaming starts the status code cannot change — an
// in-page redirect() degrades to a client-side meta tag on an HTTP 200, which
// does not pass link equity. A config redirect runs before rendering and emits a
// real 308. See next.config.ts.

// "Dresser & Mirror" (3 products), "Dresser Mirror" (3) and "Dresser and mirror"
// (1) are three spellings of one category and all slugify to `dresser-mirror`.
// Merging them is a data task the office still owes. Until then the shared slug
// resolves to the typeset spelling; the other two stay reachable — and
// self-canonical — under their exact encoded names, so nothing is orphaned.
const SLUG_OVERRIDES: Record<string, string> = {
  'dresser-mirror': 'Dresser & Mirror',
};

export type Resolved =
  | { kind: 'room'; value: string; canonical: string }
  | { kind: 'category'; value: string; canonical: string }
  | { kind: 'none' };

/**
 * The canonical path for a category. A category owns the clean slug only when
 * it is the sole category that slugifies to it (or the declared winner of a
 * collision); a shadowed spelling keeps its encoded name so the two never
 * fight over one URL.
 */
export function categoryPath(name: string, categories: string[]): string {
  const slug = slugify(name);
  const sharing = categories.filter((c) => slugify(c) === slug);
  const ownsSlug = sharing.length <= 1 || SLUG_OVERRIDES[slug] === name;
  return ownsSlug ? `/shop/${slug}` : `/shop/${encodeURIComponent(name)}`;
}

/**
 * Resolve one URL segment (already percent-decoded) to what it should render.
 *
 * Order matters: an exact category-name match is tried before the slug lookup
 * so legacy %20 URLs for a shadowed spelling still land on their own category
 * rather than being swallowed by the collision winner.
 */
export function resolveCatalogSlug(segment: string, categories: string[]): Resolved {
  const raw = segment.trim();
  const slug = slugify(raw);
  if (!slug) return { kind: 'none' };

  const room = ROOM_SLUGS[slug];
  if (room) return { kind: 'room', value: room, canonical: `/shop/${slugify(room)}` };

  const exact = categories.find((c) => c === raw);
  if (exact) return { kind: 'category', value: exact, canonical: categoryPath(exact, categories) };

  const override = SLUG_OVERRIDES[slug];
  if (override && categories.includes(override)) {
    return { kind: 'category', value: override, canonical: `/shop/${slug}` };
  }

  const matches = categories.filter((c) => slugify(c) === slug).sort();
  if (matches.length) {
    return { kind: 'category', value: matches[0], canonical: categoryPath(matches[0], categories) };
  }

  return { kind: 'none' };
}
