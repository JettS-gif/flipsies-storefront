import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  autoPlace, rotatedDims, DEFS_BY_ID, SECT_DEFAULT_ROT, CANVAS_PIECES,
  computeFootprint, SECT_U,
} from './sectionalCanvas';

// Sectional pieces must start FACING THE VIEWER.
//
// The geometry is authored with the seat back along the top edge — as if you
// were standing behind the sectional looking down — so at rot 0 an LSF piece
// draws its arm on the RIGHT and reading a layout means mentally mirroring every
// piece against its own label. The admin builder fixed this on 2026-08-10
// (DeliverDeskFrontEnd cf2fde8, SECT_DEFAULT_ROT); the storefront canvas shares
// the geometry convention but was never given the same default, so the two
// builders disagreed about which way a sectional faces.
//
// The safety argument for 180 specifically is that it is a pure facing change:
// footprint, grid snapping and hit-testing all key off rotatedDims(), which
// returns the same w/h for 0 and 180. That property is what makes this safe, so
// it is asserted here rather than assumed — if someone ever makes rotatedDims
// treat 180 like 90, layouts silently start colliding.

describe('sectional canvas — pieces start facing the viewer', () => {
  it('SECT_DEFAULT_ROT is 180, matching the admin builder', () => {
    expect(SECT_DEFAULT_ROT).toBe(180);
  });

  it('autoPlace starts a piece facing the viewer', () => {
    expect(autoPlace([], 'Armless Sofa').rot).toBe(SECT_DEFAULT_ROT);
  });

  it('every subsequent auto-placed piece faces the viewer too', () => {
    let placed = [autoPlace([], 'Armless Sofa')];
    for (const id of ['LSF Sofa w/ Corner', 'RSF Sofa w/ Corner']) {
      if (!DEFS_BY_ID[id]) continue;
      placed = [...placed, autoPlace(placed, id)];
    }
    expect(placed.length).toBeGreaterThan(1);
    for (const p of placed) expect(p.rot).toBe(SECT_DEFAULT_ROT);
  });

  it('still packs left to right — facing changed, layout did not', () => {
    const a = autoPlace([], 'Armless Sofa');
    const b = autoPlace([a], 'Armless Sofa');
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBe(a.y);
  });
});

describe('sectional canvas — 180 is a facing change, not a geometry change', () => {
  // This is the property the whole change rests on.
  it('rotatedDims is identical at 0 and 180 for every piece', () => {
    for (const pd of CANVAS_PIECES) {
      const at0 = rotatedDims(pd, 0);
      const at180 = rotatedDims(pd, 180);
      expect(at180, `${pd.id} footprint must not change at 180`).toEqual(at0);
    }
  });

  it('rotatedDims still swaps at 90 and 270, so the Rotate button works', () => {
    const pd = CANVAS_PIECES.find(p => p.w !== p.h);
    expect(pd, 'need a non-square piece to prove the swap').toBeTruthy();
    if (!pd) return;
    expect(rotatedDims(pd, 90)).toEqual({ w: pd.h, h: pd.w });
    expect(rotatedDims(pd, 270)).toEqual({ w: pd.h, h: pd.w });
  });
});

describe('sectional canvas — the two placement paths cannot drift', () => {
  // There are two ways a piece enters the canvas: autoPlace (picked from the
  // list) and tap-to-place (tapped onto the grid). A literal at either site is
  // how they end up with different defaults, which is exactly the class of bug
  // this change is fixing across two repos.
  const SRC = [
    path.join(__dirname, 'sectionalCanvas.ts'),
    path.join(__dirname, '..', 'components', 'SectionalCanvas.tsx'),
  ];

  it('no placement path hardcodes a rotation', () => {
    for (const f of SRC) {
      const src = fs.readFileSync(f, 'utf8');
      const offenders = src
        .split(/\r?\n/)
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(({ line }) => /\brot:\s*\d/.test(line) && !line.startsWith('//'));
      expect(
        offenders,
        `${path.basename(f)} must use SECT_DEFAULT_ROT, not a numeric literal:\n` +
          offenders.map(o => `  :${o.n} ${o.line}`).join('\n'),
      ).toEqual([]);
    }
  });
});

// Mirrors DeliverDeskFrontEnd src/sectional/dims.test.js: the two copies of
// computeFootprint must agree. This is the case that exposed the old
// per-square model (2026-09-15): pieces are not the same inches per grid square.
describe('sectional canvas — overall footprint in real inches', () => {
  const U = SECT_U;
  const defs = {
    'LSF Loveseat': { w: 2, h: 1 },
    'Armless Chair': { w: 1, h: 1 },
    'RSF Sofa w/ Corner': { w: 3, h: 1 },
  };
  const dims = {
    'LSF Loveseat': { w: 63, d: 44, h: 41 },
    'Armless Chair': { w: 25, d: 44, h: 41 },
    'RSF Sofa w/ Corner': { w: 104, d: 44, h: 41 },
  };

  it('a Tori L reads 132 wide by 104 deep', () => {
    const placed = [
      { defId: 'LSF Loveseat', x: 0, y: 0, rot: SECT_DEFAULT_ROT },
      { defId: 'Armless Chair', x: 2 * U, y: 0, rot: SECT_DEFAULT_ROT },
      { defId: 'RSF Sofa w/ Corner', x: 3 * U, y: 0, rot: 90 },
    ];
    expect(computeFootprint(placed as never, dims, defs as never, U))
      .toMatchObject({ w: 132, d: 104, h: 41, complete: true });
  });

  it('a straight run sums its widths', () => {
    const placed = [
      { defId: 'LSF Loveseat', x: 0, y: 0, rot: SECT_DEFAULT_ROT },
      { defId: 'Armless Chair', x: 2 * U, y: 0, rot: SECT_DEFAULT_ROT },
    ];
    expect(computeFootprint(placed as never, dims, defs as never, U)).toMatchObject({ w: 88, d: 44 });
  });
});
