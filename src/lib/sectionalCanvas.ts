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
  if (!placed || !placed.length) return { w: 0, d: 0, h: 0, complete: true, missing: 0 };
  const colW: Record<number, number> = {};
  const rowD: Record<number, number> = {};
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
    const spanC = Math.max(1, Math.round(gridW * 2));
    const spanR = Math.max(1, Math.round(gridH * 2));
    const perC = realX / spanC;
    const perR = realY / spanR;
    for (let c = col0; c < col0 + spanC; c++) colW[c] = Math.max(colW[c] || 0, perC);
    for (let r = row0; r < row0 + spanR; r++) rowD[r] = Math.max(rowD[r] || 0, perR);

    if (real.h != null) maxH = Math.max(maxH, real.h);
  }

  const w = Object.values(colW).reduce((a, b) => a + b, 0);
  const d = Object.values(rowD).reduce((a, b) => a + b, 0);
  return { w: Math.round(w), d: Math.round(d), h: Math.round(maxH), complete: missing === 0 && counted > 0, missing };
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
  return { id: nextId, defId, x: snapGrid(maxRight + (placed.length ? SECT_U * 0.25 : 0)), y: gy, rot: 0 };
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

  c.restore();

  if (isSel) {
    c.save(); c.strokeStyle = '#1D9E75'; c.lineWidth = 1.5; c.setLineDash([4, 3]);
    c.strokeRect(x - 4, y - 4, pw + 8, ph + 8); c.setLineDash([]); c.restore();
  }
}
