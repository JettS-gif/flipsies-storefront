// Pick the image that best represents a whole COLLECTION on a browse card.
//
// A collection card stands for a room's worth of furniture, so a styled room
// shot sells it far better than a cut-out of one piece on white — which is what
// "first image of the first product that has one" was giving us.
//
// There is no room-shot flag in the catalog, but there is a naming convention
// the vendor photography already follows and that Jett's own harvested files
// match: the word `room` or `lifestyle` as a token in the filename —
// `7004-elise-ink-room-shot.jpg`, `3165_Amelia_SofaChair_Sand_Room.jpg`,
// `2125_Avondale_Burlap_room_shrm.jpg`, `..._Lifestyle_2022-Z.jpg`.
// 87 of 1,578 sampled catalog images match, so most collections still fall back
// to a product photo — the point is that the ones with a room shot use it.
//
// Token-bounded on purpose: `..._angle1.jpg` (a product angle) and `-swp.jpg`
// (a swatch) must NOT match, and neither should a stray "showroom" substring.
const ROOM_SHOT = /(^|[-_])(room|lifestyle)([-_.]|$)/i;

export function isRoomShot(url: string): boolean {
  try {
    const file = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
    return ROOM_SHOT.test(file);
  } catch {
    return false;
  }
}

/**
 * First room shot among the candidates, else the first image of any kind.
 * Returns null when nothing has a photo.
 */
export function pickHeroImage(urls: (string | null | undefined)[]): string | null {
  const imgs = urls.filter((u): u is string => !!u);
  return imgs.find(isRoomShot) ?? imgs[0] ?? null;
}

// ── Packages ────────────────────────────────────────────────────────────────
//
// A package's hero was `pkg.images[0]` at three separate call sites, and only
// ONE of them had a fallback. Measured 2026-09-04: 26 of 77 published packages
// carry no images of their own, and 24 of those have item photos sitting right
// there. So the storefront CARD borrowed an item photo and rendered fine, while
// the package's own DETAIL page rendered a blank hero and emitted Product
// JSON-LD with no image at all — click the nice picture, land on nothing.
// DeliverDesk's package list showed the same blank thumbnail.
//
// Nothing ever writes packages.images automatically (the admin save just carries
// the existing array through), so these do not heal on their own.
//
// ONE helper, used by every surface, so the three cannot drift again.
//
// ── WHICH COMPONENT WE BORROW FROM IS THE WHOLE GAME (Crown Mark) ───────────
//
// Most of the affected packages are Crown Mark bedroom sets, and Jett's summary
// of them is exact: "the only image we have for them is the hero image of the
// package". That set shot is attached to the BED component — a fully styled
// room, bed + nightstands + mirror. The case goods carry tight single-piece
// crops instead, sometimes in a different finish (Veda's dresser photo is
// driftwood while its set shot is white).
//
// So borrowing from the first component is right and borrowing from an
// arbitrary one is badly wrong: you either show the room or you show a cropped
// drawer front in the wrong colour. `position` is the operator's own ordering
// and puts the bed first, which is why callers must sort by it — the storefront
// list already does (projectPackage in server.js), and that is exactly why the
// CARD looked fine while everything else did not.
//
// pickHeroImage still runs underneath, but it cannot help this vendor: these
// files are re-hosted under opaque timestamp names (1784744657037.jpg), so the
// room/lifestyle filename convention it keys on never matches. It stays for the
// vendors whose filenames do follow it.

export interface PackageLike {
  images?: (string | null | undefined)[] | null;
  items?: ({ images?: (string | null | undefined)[] | null } | null)[] | null;
}

/**
 * Every image that may represent this package, best first.
 *
 * A package's OWN images win and keep their given order — that order is a
 * choice somebody made, and re-ranking it by room shot would silently override
 * them. Only when a package has none do we borrow from its components, and
 * there pickHeroImage applies: a styled room shot sells a five-piece set far
 * better than a cut-out of one headboard on white.
 *
 * Borrowing rather than storing is deliberate. The product stays the single
 * source of the photo, so the day somebody shoots the actual set — or simply
 * adds a better product photo — every surface picks it up with no backfill and
 * no stale copy to chase.
 */
export function packageImages(pkg: PackageLike | null | undefined): string[] {
  const own = (pkg?.images ?? []).filter((u): u is string => !!u);
  if (own.length) return own;

  const borrowed = (pkg?.items ?? [])
    .flatMap((i) => i?.images ?? [])
    .filter((u): u is string => !!u);
  if (!borrowed.length) return [];

  // Put the room shot first if there is one; keep the rest in item order.
  const hero = pickHeroImage(borrowed);
  return hero ? [hero, ...borrowed.filter((u) => u !== hero)] : borrowed;
}

/** The single image to show for a package, or null when it truly has none. */
export function packageHero(pkg: PackageLike | null | undefined): string | null {
  return packageImages(pkg)[0] ?? null;
}
