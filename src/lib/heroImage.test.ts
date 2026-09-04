import { describe, it, expect } from 'vitest';
import { isRoomShot, pickHeroImage, packageImages, packageHero } from './heroImage';

// Every filename below is a real one from the live catalog (or from Jett's
// harvested room shots in docs/), not an invented example — the whole mechanism
// rests on the naming convention actually holding.
const ROOM_SHOTS = [
  '7004-elise-ink-room-shot.jpg',
  '7004-elise-ink-room-shot-1.jpg',
  '3165_Amelia_SofaChair_Sand_Room.jpg',
  '6240p-6240p-big-mans-in-243-17-kobe-cognac-room-scene-090415-scaled.jpg',
  '2125_Avondale_Burlap_room_shrm.jpg',
  '1784399873366-6-B128-04_Lifestyle_2022-Z.jpg',
  '2240_tori_birch_large_room.jpg',
  '2242_Barrett_Stone_room.jpg',
  '2242_barrett_stone_sofachair_room_angle.jpg',
];

const NOT_ROOM_SHOTS = [
  '212501235019297149_avondale_chair_burlap_angle1.jpg',
  '212511193939_avondale_swivel_nutmeg_closed_angle1.jpg',
  '101-Flash-Dance-in-480-14-Hayride-Greystone-swp.jpg',
  '1013-CySpCh-2.jpg',
  '103-103-15-LiBo.jpg',
];

const BASE = 'https://xyz.supabase.co/storage/v1/object/public/product-images/';

describe('isRoomShot', () => {
  it.each(ROOM_SHOTS)('accepts %s', (f) => {
    expect(isRoomShot(BASE + f)).toBe(true);
  });

  it.each(NOT_ROOM_SHOTS)('rejects %s', (f) => {
    expect(isRoomShot(BASE + f)).toBe(false);
  });

  it('requires "room" as a token, so a "showroom" substring does not qualify', () => {
    expect(isRoomShot(`${BASE}hoover-showroom.jpg`)).toBe(false);
  });

  it('ignores a query string', () => {
    expect(isRoomShot(`${BASE}2242_Barrett_Stone_room.jpg?width=600`)).toBe(true);
  });

  it('survives a malformed percent-escape rather than throwing', () => {
    expect(isRoomShot(`${BASE}100%bad.jpg`)).toBe(false);
  });
});

describe('pickHeroImage', () => {
  it('prefers a room shot over an earlier cut-out product photo', () => {
    const cutout = `${BASE}212501235019297149_avondale_chair_burlap_angle1.jpg`;
    const roomShot = `${BASE}2125_Avondale_Burlap_room_shrm.jpg`;
    expect(pickHeroImage([cutout, roomShot])).toBe(roomShot);
  });

  it('falls back to the first image when no room shot exists', () => {
    const a = `${BASE}1013-CySpCh-2.jpg`;
    const b = `${BASE}103-103-15-LiBo.jpg`;
    expect(pickHeroImage([a, b])).toBe(a);
  });

  it('skips null and undefined entries', () => {
    const a = `${BASE}1013-CySpCh-2.jpg`;
    expect(pickHeroImage([null, undefined, a])).toBe(a);
  });

  it('returns null when nothing has a photo', () => {
    expect(pickHeroImage([])).toBeNull();
    expect(pickHeroImage([null, undefined])).toBeNull();
  });
});

// ── Package heroes ──────────────────────────────────────────────────────────
//
// The bug (Jett, 2026-09-04): "some of our packages not updating the hero image
// from available hero thumbnails". Measured on the live catalog — 26 of 77
// published packages have no images of their own, 24 of those have a component
// photo available, and only ONE of the three surfaces that draws a package hero
// had a fallback. So a card showed a photo and its own detail page showed a
// blank, on the same package.
//
// URLs below are the real re-hosted shapes for the affected Crown Mark sets.
const VEDA_SET_SHOT = 'https://x.supabase.co/…/products/7ea7c03b/1784744657037.jpg';
const VEDA_DRESSER  = 'https://x.supabase.co/…/products/_crownmark_shared/b3300-1.jpg';

describe('packageImages / packageHero', () => {
  it("uses the package's own image when it has one", () => {
    const pkg = { images: ['/own.jpg'], items: [{ images: [VEDA_SET_SHOT] }] };
    expect(packageHero(pkg)).toBe('/own.jpg');
  });

  it("keeps the package's own image ORDER — that order is somebody's choice", () => {
    // A room shot among the package's own images must not jump the queue; the
    // operator put them in that order deliberately.
    const pkg = { images: ['/first.jpg', '/second-room-shot.jpg'] };
    expect(packageImages(pkg)).toEqual(['/first.jpg', '/second-room-shot.jpg']);
  });

  it('borrows the FIRST component photo when the package has none', () => {
    // This is the Crown Mark case and the whole reason order matters: the bed
    // carries the styled set shot, the dresser carries a tight crop. Items
    // arrive sorted by position (backend), so first = the bed.
    const pkg = { images: [], items: [{ images: [VEDA_SET_SHOT] }, { images: [VEDA_DRESSER] }] };
    expect(packageHero(pkg)).toBe(VEDA_SET_SHOT);
  });

  it('skips components that have no photo rather than yielding null', () => {
    // Real shape: SETB3650-K's position 0 is the King Rail, which has no image
    // at all, and position 1 is the headboard that carries the set shot.
    const pkg = { images: [], items: [{ images: [] }, { images: null }, { images: [VEDA_SET_SHOT] }] };
    expect(packageHero(pkg)).toBe(VEDA_SET_SHOT);
  });

  it('still prefers a room shot when a vendor names files conventionally', () => {
    // Crown Mark cannot benefit (opaque timestamp filenames), but vendors whose
    // names follow the convention should.
    const pkg = { images: [], items: [
      { images: ['/2125_Avondale_Burlap_angle1.jpg'] },
      { images: ['/2125_Avondale_Burlap_room_shrm.jpg'] },
    ] };
    expect(packageHero(pkg)).toBe('/2125_Avondale_Burlap_room_shrm.jpg');
  });

  it('returns null only when there is genuinely no photo anywhere', () => {
    // Two published packages really are in this state and no fallback can help
    // them — they need a photograph, not code.
    expect(packageHero({ images: [], items: [{ images: [] }] })).toBeNull();
    expect(packageHero({})).toBeNull();
    expect(packageHero(null)).toBeNull();
  });

  it('survives the shapes the API actually returns', () => {
    // items absent, images null, a null item in the array — all seen in the wild.
    expect(packageHero({ images: null, items: null })).toBeNull();
    expect(packageHero({ items: [null, { images: [VEDA_SET_SHOT] }] })).toBe(VEDA_SET_SHOT);
  });
});
