// ── Sectional canvas geometry + dimension math (Phase 3.A.2) ───────────────
//
// TypeScript port of DeliverDeskFrontEnd/src/sectional/builder.js (piece
// geometry + canvas drawing) and src/sectional/dims.js (parse + footprint).
// Keep the two in sync — the `id` of each piece maps 1:1 to
// products.sectional_piece_type, the same as PIECE_META in lib/sectional.ts.
//
// This module is pure (no React, no DOM globals beyond the passed-in 2D
// context) so the geometry can be unit-reasoned and shared by the canvas
// component + the list wizard's footprint readout.

export const SECT_U = 64; // grid unit px (storefront canvas is a touch tighter than the admin 68)

// Starting rotation for a newly placed piece.
//
// The piece geometry is authored with the seat back along the TOP edge — drawn
// as if you were standing BEHIND the sectional looking down. On screen that puts
// an LSF piece's arm on the right, so reading a layout means mentally mirroring
// every piece against its own label. 180° turns each piece to face the viewer,
// which is how you look at a sectional on a showroom floor.
//
// PORTED FROM THE ADMIN BUILDER, which got this on 2026-08-10
// (DeliverDeskFrontEnd cf2fde8, `SECT_DEFAULT_ROT` in src/sectional/builder.js).
// Chris G: the arm on RSF/LSF should be on the correct side when you look at it.
// Jett: rotate every piece twice for its starting position. The storefront canvas
// shares the geometry convention but was never given the same default, so the two
// builders disagreed about which way a sectional faces — the same rule landing in
// one place and not its sibling.
//
// A taste call, not a correctness one: the piece names, the matcher and the order
// that comes out the far end were never wrong, only the picture was awkward to read.
//
// Safe by construction, same as the admin change:
//   • rotatedDims() returns identical w/h for 0 and 180 (only 90/270 swap), so
//     footprint, grid snapping and hit-testing are untouched — only facing changes.
//   • drawPiece() rotates about the piece centre, so 180° turns in place rather
//     than displacing it.
//   • Layouts live in component state for the life of the page and are never
//     persisted, so there are no stored rot values to migrate.
// The ↻ Rotate button still cycles +90 from this new starting point.
//
// One named constant rather than a literal at each site, so the auto-place path
// and the tap-to-place path cannot drift to different defaults.
export const SECT_DEFAULT_ROT = 180;

export type Side = 'left' | 'right' | 'top' | 'bottom';
export interface Connector { side: Side; pos: number }
export interface Zone { type: 'front' | 'back' | 'arm' | 'cushion'; side: Side; from: number; to: number }
export interface PieceDef {
  id: string;
  label: string;
  group: string;
  w: number;
  h: number;
  snapEdge: 'bottom' | null;
  connectors: Connector[];
  zones: Zone[];
  isCorner?: boolean;
  sofaCorner?: 'l' | 'r';
  isChaise?: 'l' | 'r';
  isConsole?: boolean;
  isFreestanding?: boolean;
  ottomanScale?: number;
}

export interface PlacedPiece { id: number; defId: string; x: number; y: number; rot: number }
export interface Dim { w: number | null; d: number | null; h: number | null }
export interface Footprint { w: number; d: number; h: number; complete: boolean; missing: number }

export const CANVAS_PIECES: PieceDef[] = [
  { id: 'Armless Chair',    label: 'Armless Chair',    group: 'Chairs',   w: 1,   h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }, { side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }] },
  { id: 'Armless Recliner', label: 'Armless Recliner', group: 'Chairs',   w: 1,   h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }, { side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }] },
  { id: 'LSF Chair',        label: 'LSF Chair',        group: 'Chairs',   w: 1,   h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'arm', side: 'right', from: 0, to: 1 }] },
  { id: 'RSF Chair',        label: 'RSF Chair',        group: 'Chairs',   w: 1,   h: 1,   snapEdge: null,
    connectors: [{ side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'arm', side: 'left', from: 0, to: 1 }] },
  { id: 'Corner',           label: 'Corner',           group: 'Corners',  w: 1,   h: 1,   snapEdge: null,
    connectors: [{ side: 'right', pos: .5 }, { side: 'top', pos: .5 }],
    zones: [{ type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'back', side: 'left', from: 0, to: 1 }], isCorner: true },
  { id: 'Wedge',            label: 'Wedge',            group: 'Corners',  w: 1,   h: 1,   snapEdge: null,
    connectors: [{ side: 'right', pos: .5 }, { side: 'top', pos: .5 }],
    zones: [{ type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'back', side: 'left', from: 0, to: 1 }], isCorner: true },
  { id: 'Armless Loveseat', label: 'Armless Loveseat', group: 'Loveseats', w: 2,  h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }, { side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }] },
  { id: 'LSF Loveseat',     label: 'LSF Loveseat',     group: 'Loveseats', w: 2,  h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'arm', side: 'right', from: 0, to: 1 }] },
  { id: 'RSF Loveseat',     label: 'RSF Loveseat',     group: 'Loveseats', w: 2,  h: 1,   snapEdge: null,
    connectors: [{ side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'arm', side: 'left', from: 0, to: 1 }] },
  { id: 'Armless Sofa',     label: 'Armless Sofa',     group: 'Sofas',    w: 3,   h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }, { side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }] },
  { id: 'LSF Sofa',         label: 'LSF Sofa',         group: 'Sofas',    w: 3,   h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'arm', side: 'right', from: 0, to: 1 }] },
  { id: 'RSF Sofa',         label: 'RSF Sofa',         group: 'Sofas',    w: 3,   h: 1,   snapEdge: null,
    connectors: [{ side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'arm', side: 'left', from: 0, to: 1 }] },
  { id: 'LSF Sofa w/ Corner', label: 'LSF Sofa w/ Corner', group: 'Sofas', w: 3, h: 1,   snapEdge: null,
    connectors: [{ side: 'top', pos: 1 / 6 }],
    zones: [{ type: 'front', side: 'top', from: 1 / 3, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'back', side: 'left', from: 0, to: 1 }, { type: 'arm', side: 'right', from: 0, to: 1 }], sofaCorner: 'l' },
  { id: 'RSF Sofa w/ Corner', label: 'RSF Sofa w/ Corner', group: 'Sofas', w: 3, h: 1,   snapEdge: null,
    connectors: [{ side: 'top', pos: 5 / 6 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 2 / 3 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'back', side: 'right', from: 0, to: 1 }, { type: 'arm', side: 'left', from: 0, to: 1 }], sofaCorner: 'r' },
  { id: 'LSF Chaise',       label: 'LSF Chaise',       group: 'Chaises',  w: 1,   h: 1.5, snapEdge: 'bottom',
    connectors: [{ side: 'left', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'cushion', side: 'right', from: 0, to: 1 / 3 }, { type: 'arm', side: 'right', from: 1 / 3, to: 1 }], isChaise: 'l' },
  { id: 'RSF Chaise',       label: 'RSF Chaise',       group: 'Chaises',  w: 1,   h: 1.5, snapEdge: 'bottom',
    connectors: [{ side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'cushion', side: 'left', from: 0, to: 1 / 3 }, { type: 'arm', side: 'left', from: 1 / 3, to: 1 }], isChaise: 'r' },
  { id: 'LSF Cuddler',      label: 'LSF Cuddler',      group: 'Chaises',  w: 1.5, h: 1.5, snapEdge: 'bottom',
    connectors: [{ side: 'left', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'cushion', side: 'right', from: 0, to: 1 / 3 }, { type: 'arm', side: 'right', from: 1 / 3, to: 1 }], isChaise: 'l' },
  { id: 'RSF Cuddler',      label: 'RSF Cuddler',      group: 'Chaises',  w: 1.5, h: 1.5, snapEdge: 'bottom',
    connectors: [{ side: 'right', pos: .5 }],
    zones: [{ type: 'front', side: 'top', from: 0, to: 1 }, { type: 'back', side: 'bottom', from: 0, to: 1 }, { type: 'cushion', side: 'left', from: 0, to: 1 / 3 }, { type: 'arm', side: 'left', from: 1 / 3, to: 1 }], isChaise: 'r' },
  { id: 'Console',          label: 'Console',          group: 'Consoles', w: 0.5, h: 1,   snapEdge: null,
    connectors: [{ side: 'left', pos: .5 }, { side: 'right', pos: .5 }],
    zones: [{ type: 'back', side: 'bottom', from: 0, to: 1 }], isConsole: true },
  { id: 'Cocktail Ottoman', label: 'Cocktail Ottoman', group: 'Ottomans', w: 1,   h: 1,   snapEdge: null,
    connectors: [], zones: [], isFreestanding: true, ottomanScale: 0.75 },
  { id: 'Ottoman',          label: 'Ottoman',          group: 'Ottomans', w: 1,   h: 0.25, snapEdge: null,
    connectors: [], zones: [], isFreestanding: true },
];

export const DEFS_BY_ID: Record<string, PieceDef> = Object.fromEntries(CANVAS_PIECES.map((p) => [p.id, p]));
export const GROUP_ORDER_CANVAS = ['Sofas', 'Loveseats', 'Chaises', 'Chairs', 'Corners', 'Consoles', 'Ottomans'];

const ZONE_COLORS: Record<string, string> = {
  back: 'rgba(160,155,145,0.45)', arm: 'rgba(53,100,163,0.28)',
  front: 'rgba(255,255,255,0.55)', cushion: 'rgba(29,158,117,0.18)',
};

// ── Dimension math (mirror of DeliverDeskFrontEnd/src/sectional/dims.js) ────

export function parseDimensions(str: string | null | undefined): Dim | null {
  if (!str) return null;
  const s = String(str);
  const grab = (axis: string): number | null => {
    const m = s.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*"?\\s*' + axis + '\\b', 'i'));
    return m ? parseFloat(m[1]) : null;
  };
  const w = grab('W'), d = grab('D'), h = grab('H');
  if (w == null && d == null && h == null) return null;
  return { w, d, h };
}

export function computeFootprint(
  placed: PlacedPiece[],
  dimsByType: Record<string, Dim | undefined>,
  defsById: Record<string, PieceDef>,
  unit: number,
): Footprint {
  // Longest chain of real lengths per axis. Mirrors DeliverDeskFrontEnd
  // src/sectional/dims.js, where the reasoning lives: the old per-square model
  // assumed every grid square is the same number of inches, so an L whose pieces
  // differ (Tori: 63/2, 25/1, 104/3) read 132 x 113 instead of 132 x 104.
  if (!placed || !placed.length) return { w: 0, d: 0, h: 0, complete: true, missing: 0 };
  const xEdges: Edge[] = [];
  const yEdges: Edge[] = [];
  let maxH = 0, missing = 0, counted = 0;

  for (const pi of placed) {
    const def = defsById[pi.defId];
    const real = dimsByType && dimsByType[pi.defId];
    if (!def) continue;
    if (!real || real.w == null || real.d == null) { missing++; continue; }
    counted++;

    const rotated = pi.rot === 90 || pi.rot === 270;
    const gridW = rotated ? def.h : def.w;
    const gridH = rotated ? def.w : def.h;
    const realX = rotated ? real.d : real.w;
    const realY = rotated ? real.w : real.d;

    const col0 = Math.round((pi.x / unit) * 2);
    const row0 = Math.round((pi.y / unit) * 2);
    xEdges.push({ from: col0, to: col0 + Math.max(1, Math.round(gridW * 2)), len: realX });
    yEdges.push({ from: row0, to: row0 + Math.max(1, Math.round(gridH * 2)), len: realY });

    if (real.h != null) maxH = Math.max(maxH, real.h);
  }

  return {
    w: Math.round(longestChain(xEdges)),
    d: Math.round(longestChain(yEdges)),
    h: Math.round(maxH),
    complete: missing === 0 && counted > 0,
    missing,
  };
}

type Edge = { from: number; to: number; len: number };

// Longest path lowest edge → highest; a piece is an edge weighted by its real
// length, an uncovered stretch between edges costs 0.
function longestChain(edges: Edge[]): number {
  if (!edges.length) return 0;
  const nodes = [...new Set(edges.flatMap((e) => [e.from, e.to]))].sort((a, b) => a - b);
  const dist = new Map<number, number>(nodes.map((n) => [n, 0]));
  const out = new Map<number, Edge[]>(nodes.map((n) => [n, []]));
  for (const e of edges) out.get(e.from)!.push(e);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const here = dist.get(n)!;
    if (i + 1 < nodes.length) dist.set(nodes[i + 1], Math.max(dist.get(nodes[i + 1])!, here));
    for (const e of out.get(n)!) dist.set(e.to, Math.max(dist.get(e.to)!, here + e.len));
  }
  return dist.get(nodes[nodes.length - 1])!;
}

export function formatFootprint(fp: Footprint | null): string {
  if (!fp || (!fp.w && !fp.d)) return '';
  const parts: string[] = [];
  if (fp.w) parts.push(fp.w + '"W');
  if (fp.d) parts.push(fp.d + '"D');
  if (fp.h) parts.push(fp.h + '"H');
  return parts.join(' × ');
}

// ── Grid + placement helpers ───────────────────────────────────────────────

export function snapGrid(v: number): number { return Math.round(v / SECT_U) * SECT_U; }
export function rotatedDims(pd: PieceDef, rot: number): { w: number; h: number } {
  return (rot === 90 || rot === 270) ? { w: pd.h, h: pd.w } : { w: pd.w, h: pd.h };
}

/** Snapped top-left for placing a new piece centered on (mx,my). */
export function placementXY(pd: PieceDef, mx: number, my: number): { gx: number; gy: number } {
  const { w: effW, h: effH } = rotatedDims(pd, 0);
  if (pd.snapEdge === 'bottom') {
    const cellCol = Math.floor(mx / SECT_U);
    const cellRow = Math.floor(my / SECT_U);
    return {
      gx: snapGrid((cellCol + 0.5) * SECT_U - effW * SECT_U / 2),
      gy: (cellRow + 1) * SECT_U - effH * SECT_U,
    };
  }
  return { gx: snapGrid(mx - effW * SECT_U / 2), gy: snapGrid(my - effH * SECT_U / 2) };
}

/** Append a piece to the right of the current arrangement (list → canvas). */
export function autoPlace(placed: PlacedPiece[], defId: string): PlacedPiece {
  const def = DEFS_BY_ID[defId];
  const y = SECT_U * 2;
  let maxRight = SECT_U; // left margin
  for (const p of placed) {
    const d = DEFS_BY_ID[p.defId];
    if (!d) continue;
    if (p.y > y + SECT_U) continue; // only consider the seed row when packing
    const rot = p.rot === 90 || p.rot === 270;
    const w = (rot ? d.h : d.w) * SECT_U;
    maxRight = Math.max(maxRight, p.x + w);
  }
  const nextId = placed.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  const gy = def && def.snapEdge === 'bottom' ? y - ((def.h - 1) * SECT_U) : y;
  return { id: nextId, defId, x: snapGrid(maxRight + (placed.length ? SECT_U * 0.25 : 0)), y: gy, rot: SECT_DEFAULT_ROT };
}

/** Remove the most-recently-added piece of a type (list decrement). */
export function removeLastOfType(placed: PlacedPiece[], defId: string): PlacedPiece[] {
  let idx = -1, maxId = -1;
  placed.forEach((p, i) => { if (p.defId === defId && p.id > maxId) { maxId = p.id; idx = i; } });
  return idx < 0 ? placed : placed.filter((_, i) => i !== idx);
}

export function hitTest(placed: PlacedPiece[], mx: number, my: number): number | null {
  for (let i = placed.length - 1; i >= 0; i--) {
    const p = placed[i];
    const pd = DEFS_BY_ID[p.defId];
    if (!pd) continue;
    const { w, h } = rotatedDims(pd, p.rot);
    if (mx >= p.x && mx <= p.x + w * SECT_U && my >= p.y && my <= p.y + h * SECT_U) return p.id;
  }
  return null;
}

// ── Drawing ─────────────────────────────────────────────────────────────────

export function drawGrid(c: CanvasRenderingContext2D, cw: number, ch: number): void {
  c.strokeStyle = '#e0e0de'; c.lineWidth = 0.5;
  for (let x = 0; x < cw; x += SECT_U) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ch); c.stroke(); }
  for (let y = 0; y < ch; y += SECT_U) { c.beginPath(); c.moveTo(0, y); c.lineTo(cw, y); c.stroke(); }
}

function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

export function drawPiece(
  c: CanvasRenderingContext2D,
  pi: PlacedPiece,
  selectedId: number | null,
  dimsByType: Record<string, Dim | undefined>,
  showDims: boolean,
): void {
  const pd = DEFS_BY_ID[pi.defId];
  if (!pd) return;
  const { x, y, rot } = pi;
  const isSel = pi.id === selectedId;
  const { w: dw, h: dh } = rotatedDims(pd, rot);
  const pw = dw * SECT_U, ph = dh * SECT_U;
  const U = SECT_U;

  c.save();
  c.translate(x + pw / 2, y + ph / 2);
  c.rotate(rot * Math.PI / 180);
  const sc = pd.ottomanScale || 1;
  c.scale(sc, sc);
  c.translate(-pd.w * U / 2, -pd.h * U / 2);

  const rw = pd.w * U, rh = pd.h * U, pad = 3, T = 10;

  c.fillStyle = isSel ? '#d4f0e7' : '#eef8f4';
  c.strokeStyle = isSel ? '#1D9E75' : '#0F6E56';
  c.lineWidth = isSel ? 2 : 1;
  rrect(c, pad, pad, rw - pad * 2, rh - pad * 2, 6);
  c.fill(); c.stroke();

  pd.zones.forEach((z) => {
    c.fillStyle = ZONE_COLORS[z.type] || 'rgba(200,200,200,0.3)';
    let rx = 0, ry = 0, rw2 = 0, rh2 = 0;
    const { side, from, to } = z;
    if (side === 'top')    { rx = pad + from * (rw - pad * 2); ry = pad; rw2 = (to - from) * (rw - pad * 2); rh2 = T; }
    if (side === 'bottom') { rx = pad + from * (rw - pad * 2); ry = rh - pad - T; rw2 = (to - from) * (rw - pad * 2); rh2 = T; }
    if (side === 'left')   { rx = pad; ry = pad + from * (rh - pad * 2); rw2 = T; rh2 = (to - from) * (rh - pad * 2); }
    if (side === 'right')  { rx = rw - pad - T; ry = pad + from * (rh - pad * 2); rw2 = T; rh2 = (to - from) * (rh - pad * 2); }
    if (rw2 && rh2) c.fillRect(rx, ry, rw2, rh2);
  });

  if (pd.isCorner) {
    c.save(); c.strokeStyle = 'rgba(15,110,86,0.3)'; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(pad, rh - pad); c.lineTo(rw - pad, pad); c.stroke(); c.setLineDash([]); c.restore();
  }
  if (pd.sofaCorner === 'l') {
    c.save(); c.strokeStyle = 'rgba(15,110,86,0.25)'; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(rw / 3, pad); c.lineTo(rw / 3, rh - pad); c.stroke(); c.setLineDash([]); c.restore();
  }
  if (pd.sofaCorner === 'r') {
    c.save(); c.strokeStyle = 'rgba(15,110,86,0.25)'; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(rw * 2 / 3, pad); c.lineTo(rw * 2 / 3, rh - pad); c.stroke(); c.setLineDash([]); c.restore();
  }
  if (pd.isChaise) {
    const divY = rh / 3;
    c.save(); c.strokeStyle = 'rgba(15,110,86,0.25)'; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(pad, divY); c.lineTo(rw - pad, divY); c.stroke(); c.setLineDash([]); c.restore();
  }

  pd.connectors.forEach((con) => {
    const { side, pos } = con;
    const cpads = 8;
    let cx2: number | undefined, cy2 = 0;
    if (side === 'left')   { cx2 = cpads; cy2 = cpads + pos * (rh - cpads * 2); }
    if (side === 'right')  { cx2 = rw - cpads; cy2 = cpads + pos * (rh - cpads * 2); }
    if (side === 'top')    { cx2 = cpads + pos * (rw - cpads * 2); cy2 = cpads; }
    if (side === 'bottom') { cx2 = cpads + pos * (rw - cpads * 2); cy2 = rh - cpads; }
    if (cx2 !== undefined) {
      c.fillStyle = '#1D9E75'; c.strokeStyle = 'white'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(cx2, cy2, 5, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  });

  // TEXT IS COUNTER-ROTATED so it stays upright at any piece rotation.
  //
  // Everything above draws inside the piece's rotated frame, which is correct for
  // geometry — but text inherits that rotation, so a piece at 180 renders its
  // label and dimensions UPSIDE DOWN, and at 90/270 sideways. That became visible
  // the moment SECT_DEFAULT_ROT made 180 the starting position: every piece on
  // the board read upside down.
  //
  // Undo the rotation about the piece centre, so the glyphs sit level while the
  // furniture stays turned. A label is an annotation of the piece, not part of
  // the drawing of it.
  c.save();
  c.translate(rw / 2, rh / 2);
  c.rotate(-rot * Math.PI / 180);
  c.translate(-rw / 2, -rh / 2);

  c.fillStyle = '#085041';
  c.font = `500 ${Math.min(11, rw / 8)}px sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const words = pd.label.split(' '); const maxLW = rw - 24; const lines: string[] = [];
  let cur = '';
  words.forEach((ww) => { const t = cur ? cur + ' ' + ww : ww; if (c.measureText(t).width > maxLW && cur) { lines.push(cur); cur = ww; } else cur = t; });
  lines.push(cur);
  const lh = 12, sy = rh / 2 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => c.fillText(l, rw / 2, sy + i * lh));

  if (showDims) {
    const dim = dimsByType[pd.id];
    if (dim && dim.w != null && dim.d != null) {
      c.fillStyle = '#0F6E56';
      c.font = '9px sans-serif';
      c.fillText(`${dim.w}×${dim.d}"`, rw / 2, rh - 11);
    }
  }

  c.restore(); // ends the text counter-rotation
  c.restore(); // ends the piece transform

  if (isSel) {
    c.save(); c.strokeStyle = '#1D9E75'; c.lineWidth = 1.5; c.setLineDash([4, 3]);
    c.strokeRect(x - 4, y - 4, pw + 8, ph + 8); c.setLineDash([]); c.restore();
  }
}
