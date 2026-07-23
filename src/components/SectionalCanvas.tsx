'use client';

// ── SectionalCanvas (Phase 3.A.2) ──────────────────────────────────────────
// Controlled drag-and-drop canvas visualizer. It owns no piece state of its
// own — `placed` in / `onChange` out — so the list wizard and the canvas are
// two editors of ONE array: adding a piece in the list appends here, dragging
// here doesn't touch the list counts, removing in either place syncs both.
// Ported from the admin DeliverDesk builder; geometry lives in
// lib/sectionalCanvas.ts (shared, framework-free).

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  CANVAS_PIECES, DEFS_BY_ID, GROUP_ORDER_CANVAS, SECT_U,
  type PlacedPiece, type Dim,
  drawGrid, drawPiece, hitTest, placementXY, snapGrid,
  computeFootprint, formatFootprint,
} from '@/lib/sectionalCanvas';

interface Props {
  placed: PlacedPiece[];
  onChange: (next: PlacedPiece[]) => void;
  allowedTypes: string[];
  dimsByType: Record<string, Dim | undefined>;
  showDims: boolean;
  onToggleDims: () => void;
}

interface DragState {
  placedId: number; offsetX: number; offsetY: number;
  ghostX: number; ghostY: number; moved: boolean;
}

export default function SectionalCanvas({ placed, onChange, allowedTypes, dimsByType, showDims, onToggleDims }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  // Mirror latest values into refs so the imperative pointer handlers (bound
  // once) always read current props without re-binding on every render.
  const placedRef = useRef(placed);
  const activeRef = useRef<string | null>(active);
  const selectedRef = useRef<number | null>(selected);
  const showDimsRef = useRef(showDims);
  const dimsRef = useRef(dimsByType);
  const onChangeRef = useRef(onChange);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => { placedRef.current = placed; }, [placed]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { showDimsRef.current = showDims; }, [showDims]);
  useEffect(() => { dimsRef.current = dimsByType; }, [dimsByType]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const palette = useMemo(() => {
    const allow = new Set(allowedTypes);
    const defs = CANVAS_PIECES.filter((p) => allow.has(p.id));
    const groups: Record<string, typeof defs> = {};
    for (const p of defs) { (groups[p.group] ||= []).push(p); }
    return GROUP_ORDER_CANVAS.filter((g) => groups[g]?.length).map((g) => ({ group: g, pieces: groups[g] }));
  }, [allowedTypes]);

  const footprint = useMemo(
    () => computeFootprint(placed, dimsByType, DEFS_BY_ID, SECT_U),
    [placed, dimsByType],
  );
  const dimsLoaded = Object.keys(dimsByType).length > 0;

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const c = canvas.getContext('2d'); if (!c) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(c, canvas.width, canvas.height);
    for (const p of placedRef.current) drawPiece(c, p, selectedRef.current, dimsRef.current, showDimsRef.current);
  }, []);

  // Redraw whenever the layout / selection / dims overlay changes.
  useEffect(() => { draw(); }, [placed, selected, showDims, dimsByType, draw]);

  // Size the canvas to its wrapper and bind pointer handlers once.
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => { canvas.width = wrap.clientWidth || 600; canvas.height = wrap.clientHeight || 380; draw(); };
    resize();
    window.addEventListener('resize', resize);

    const pointer = (e: Event) => {
      const r = canvas.getBoundingClientRect();
      const te = e as TouchEvent;
      const src = te.touches && te.touches.length ? te.touches[0] : (e as MouseEvent);
      return { mx: src.clientX - r.left, my: src.clientY - r.top };
    };

    const onDown = (e: Event) => {
      if (e.type.startsWith('touch')) e.preventDefault();
      const { mx, my } = pointer(e);
      const act = activeRef.current;
      if (act) {
        const pd = DEFS_BY_ID[act]; if (!pd) return;
        const { gx, gy } = placementXY(pd, mx, my);
        const nextId = placedRef.current.reduce((m, p) => Math.max(m, p.id), 0) + 1;
        const next = [...placedRef.current, { id: nextId, defId: pd.id, x: gx, y: gy, rot: 0 }];
        placedRef.current = next;
        selectedRef.current = nextId;
        setActive(null);
        setSelected(nextId);
        onChangeRef.current(next);
        dragRef.current = { placedId: nextId, offsetX: mx - gx, offsetY: my - gy, ghostX: gx, ghostY: gy, moved: false };
        canvas.style.cursor = 'grabbing';
        return;
      }
      const hitId = hitTest(placedRef.current, mx, my);
      if (hitId !== null) {
        const p = placedRef.current.find((x) => x.id === hitId)!;
        dragRef.current = { placedId: hitId, offsetX: mx - p.x, offsetY: my - p.y, ghostX: p.x, ghostY: p.y, moved: false };
        selectedRef.current = hitId;
        setSelected(hitId);
        canvas.style.cursor = 'grabbing';
      } else {
        selectedRef.current = null;
        setSelected(null);
        draw();
      }
    };

    const onMove = (e: Event) => {
      const drag = dragRef.current;
      if (!drag) {
        const { mx, my } = pointer(e);
        canvas.style.cursor = hitTest(placedRef.current, mx, my) !== null ? 'grab' : (activeRef.current ? 'crosshair' : 'default');
        return;
      }
      if (e.type.startsWith('touch')) e.preventDefault();
      const { mx, my } = pointer(e);
      drag.ghostX = snapGrid(mx - drag.offsetX);
      drag.ghostY = snapGrid(my - drag.offsetY);
      if (Math.abs(mx - (drag.ghostX + drag.offsetX)) > 4 || Math.abs(my - (drag.ghostY + drag.offsetY)) > 4) drag.moved = true;
      draw();
      const c = canvas.getContext('2d'); if (!c) return;
      const p = placedRef.current.find((x) => x.id === drag.placedId); if (!p) return;
      c.save(); c.globalAlpha = 0.45;
      drawPiece(c, { ...p, x: drag.ghostX, y: drag.ghostY }, null, dimsRef.current, showDimsRef.current);
      c.restore();
      c.fillStyle = '#1D9E75'; c.beginPath(); c.arc(drag.ghostX, drag.ghostY, 4, 0, Math.PI * 2); c.fill();
    };

    const onUp = () => {
      const drag = dragRef.current; if (!drag) return;
      canvas.style.cursor = activeRef.current ? 'crosshair' : 'default';
      if (drag.moved) {
        const next = placedRef.current.map((p) => (p.id === drag.placedId ? { ...p, x: drag.ghostX, y: drag.ghostY } : p));
        placedRef.current = next;
        onChangeRef.current(next);
      }
      dragRef.current = null;
      draw();
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [draw]);

  function selectPiece(id: string) {
    setActive((cur) => (cur === id ? null : id));
    setSelected(null);
  }
  function rotate() {
    if (selected == null) return;
    onChange(placed.map((p) => (p.id === selected ? { ...p, rot: (p.rot + 90) % 360 } : p)));
  }
  function removeSel() {
    if (selected == null) return;
    onChange(placed.filter((p) => p.id !== selected));
    setSelected(null);
  }
  function clearAll() {
    onChange([]);
    setSelected(null);
    setActive(null);
  }

  const footprintLabel = formatFootprint(footprint);

  return (
    <div className="rounded-xl border border-brand-border overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-brand-border bg-brand-warm-gray">
        <button type="button" onClick={rotate} disabled={selected == null}
          className="text-xs px-2.5 py-1 rounded-md border border-brand-border bg-white disabled:opacity-40 hover:border-brand-yellow-dark">↻ Rotate</button>
        <button type="button" onClick={removeSel} disabled={selected == null}
          className="text-xs px-2.5 py-1 rounded-md border border-brand-border bg-white text-red-600 disabled:opacity-40 hover:border-red-400">✕ Remove</button>
        <button type="button" onClick={clearAll} disabled={placed.length === 0}
          className="text-xs px-2.5 py-1 rounded-md border border-brand-border bg-white text-red-600 disabled:opacity-40 hover:border-red-400">Clear</button>
        <button type="button" onClick={onToggleDims}
          className={`text-xs px-2.5 py-1 rounded-md border ${showDims ? 'border-brand-green bg-brand-green-light text-brand-green' : 'border-brand-border bg-white'}`}>📐 Dimensions</button>
        <span className="ml-auto text-xs font-semibold text-brand-green">
          {showDims && (placed.length === 0
            ? 'Overall: —'
            : !dimsLoaded
              ? 'No dimensions for this collection'
              : footprintLabel
                ? `Overall: ${footprintLabel}${footprint.complete ? '' : ` (${footprint.missing} without dims)`}`
                : 'Dimensions unavailable')}
        </span>
      </div>

      <div className="grid grid-cols-[130px_1fr]" style={{ height: 380 }}>
        {/* Palette */}
        <div className="border-r border-brand-border bg-brand-warm-gray/50 overflow-y-auto p-2 space-y-2">
          {palette.length === 0 && (
            <p className="text-[11px] text-brand-charcoal-light px-1">Pieces load once you pick a collection.</p>
          )}
          {palette.map(({ group, pieces }) => (
            <div key={group}>
              <p className="text-[9px] font-semibold text-brand-charcoal-light uppercase tracking-wider px-1 mb-1">{group}</p>
              <div className="space-y-1">
                {pieces.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPiece(p.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md border text-[11px] transition-colors ${active === p.id ? 'border-brand-green bg-brand-green-light text-brand-green' : 'border-brand-border bg-white hover:border-brand-green'}`}
                  >
                    <span className="font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div ref={wrapRef} className="relative bg-brand-warm-gray/30 overflow-hidden">
          <canvas ref={canvasRef} className="block touch-none" style={{ cursor: 'crosshair' }} />
          {placed.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs text-brand-charcoal-light text-center px-6">
                Pick a piece on the left, then tap the grid to place it.<br />Drag to arrange · tap a piece to rotate or remove.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
