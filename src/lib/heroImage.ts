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
