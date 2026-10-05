// Where an old link to an unpublished product lands instead of "Page Not
// Found" (Jett 2026-10-05). The backend picks the target — the package that
// now sells the piece, else its frame page, else the room — and sends it on the
// product 404 (DeliverDeskBackEnd/utils/storefrontLanding.js). This turns that
// answer into a URL. Pure, so it is unit-tested.
import { ROOM_SLUGS } from '@/lib/catalogSlugs';

export type Landing =
  | { kind: 'package'; id: string }
  | { kind: 'frame'; id: string }
  | { kind: 'category'; room: string | null; category: string | null };

// The canonical slug for each room. ROOM_SLUGS maps several slugs onto one room
// ("home-office" and "office" are both Office); the later entry is the alias,
// so keep the first one seen.
const ROOM_TO_SLUG: Record<string, string> = Object.entries(ROOM_SLUGS)
  .reduce((acc, [slug, room]) => (acc[room] ? acc : { ...acc, [room]: slug }), {} as Record<string, string>);

export function landingPath(landing: Landing | null | undefined): string | null {
  if (!landing) return null;
  if (landing.kind === 'package' && landing.id) return `/package/${landing.id}`;
  if (landing.kind === 'frame' && landing.id) return `/product/${landing.id}`;
  if (landing.kind === 'category') {
    const slug = landing.room ? ROOM_TO_SLUG[landing.room] : undefined;
    // The banner lives on room pages; with no known room, plain /shop.
    return slug ? `/shop/${slug}?gone=1` : '/shop';
  }
  return null;
}

// Links copied out of a post or a message sometimes carry junk after the id —
// a stray quote ("…a0f1%22"), a bracket, a full stop. A product id is a UUID;
// when the segment STARTS with one, that is the product the link meant.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export function normalizeProductId(raw: string): string {
  let s = raw;
  try { s = decodeURIComponent(raw); } catch { /* keep raw */ }
  const m = s.match(UUID);
  return m ? m[0].toLowerCase() : raw;
}
