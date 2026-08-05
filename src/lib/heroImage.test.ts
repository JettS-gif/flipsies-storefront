import { describe, it, expect } from 'vitest';
import { isRoomShot, pickHeroImage } from './heroImage';

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
