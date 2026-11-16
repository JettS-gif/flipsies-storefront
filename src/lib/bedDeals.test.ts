import { describe, it, expect } from 'vitest';
import { isCompleteBed, splitBySize, huntPin, bedKey, ladderFor, mattressLabel } from './bedDeals';
import type { StorefrontPackage } from './packages';

const pkg = (name: string, sku: string): StorefrontPackage => ({
  id: sku, name, sku, description: null, price: 499.94, images: [], compare_at_price: 499.94, savings: 0,
  collection: null, room: null, category: null, in_stock: true, item_count: 2, items: [],
});

describe('complete-bed bundles', () => {
  it('matches only the Complete Queen/King Bed packages with a -COMPLETE sku', () => {
    expect(isCompleteBed(pkg('Complete Queen Bed · 0023 · Grey', 'UBF-23GYQ-COMPLETE'))).toBe(true);
    expect(isCompleteBed(pkg('Complete King Bed · 009 · Beige', 'UBF-09BGK-COMPLETE'))).toBe(true);
    // a search for "complete" also matches descriptions; those must not leak in
    expect(isCompleteBed(pkg('Akerson 5PC Bedroom Set', 'B4620-SET'))).toBe(false);
    expect(isCompleteBed(pkg('Complete Queen Bed · test', 'NO-SUFFIX'))).toBe(false);
  });

  it('splits by size and sorts by name', () => {
    const { queen, king } = splitBySize([
      pkg('Complete King Bed · 212 · Light Beige', 'A-COMPLETE'),
      pkg('Complete Queen Bed · 212 · Grey', 'B-COMPLETE'),
      pkg('Complete Queen Bed · 0023 · Grey', 'C-COMPLETE'),
      pkg('Blanche 5PC Set', 'X'),
    ]);
    expect(queen.map(p => p.sku)).toEqual(['C-COMPLETE', 'B-COMPLETE']);
    expect(king.map(p => p.sku)).toEqual(['A-COMPLETE']);
  });
});

describe('mattress ladder', () => {
  const at = (name: string, sku: string, price: number) => ({ ...pkg(name, sku), price });
  const all = [
    at('Complete Queen Bed · 0023 · Grey · Mprove 3.0 Mattress', 'UBF-23GYQ-COMPLETE-MP3', 1199.97),
    at('Complete Queen Bed · 0023 · Grey · Dreamer 8" Mattress', 'UBF-23GYQ-COMPLETE', 499.97),
    at('Complete Queen Bed · 0023 · Grey · Dreamer 10" Mattress', 'UBF-23GYQ-COMPLETE-D10', 549.97),
    at('Complete Queen Bed · 212 · Grey · Dreamer 8" Mattress', 'UBF-12GYQ-COMPLETE', 499.97),
    at('Complete King Bed · 009 · Beige · Dreamer 10" Mattress', 'UBF-09BGK-COMPLETE', 599.97),
  ];

  it('keys every step of one bed together', () => {
    expect(bedKey(all[0])).toBe('UBF-23GYQ');
    expect(bedKey(all[1])).toBe('UBF-23GYQ');
    expect(isCompleteBed(all[0])).toBe(true);
  });

  it('lists one bed\'s steps cheapest first, and only that bed', () => {
    expect(ladderFor(all[0], all).map(p => p.sku)).toEqual(['UBF-23GYQ-COMPLETE', 'UBF-23GYQ-COMPLETE-D10', 'UBF-23GYQ-COMPLETE-MP3']);
  });

  it('shows one card per bed (its cheapest step) on Deals', () => {
    const { queen, king } = splitBySize(all);
    expect(queen.map(p => p.sku)).toEqual(['UBF-23GYQ-COMPLETE', 'UBF-12GYQ-COMPLETE']);
    expect(king.map(p => p.sku)).toEqual(['UBF-09BGK-COMPLETE']);
  });

  it('labels a step by its mattress', () => {
    expect(mattressLabel(all[2])).toBe('Dreamer 10" Mattress');
    expect(mattressLabel(pkg('Complete Queen Bed · 0023 · Grey', 'X-COMPLETE'))).toBe('Mattress');
  });
});

describe('hunt PIN window (Sat 2026-11-21, 12:00–16:00 CST)', () => {
  it('is hidden before, shown during, hidden after', () => {
    expect(huntPin(new Date('2026-11-21T17:59:59Z'))).toBeNull();
    expect(huntPin(new Date('2026-11-21T18:00:00Z'))).toBe('SNOOZE');
    expect(huntPin(new Date('2026-11-21T21:59:59Z'))).toBe('SNOOZE');
    expect(huntPin(new Date('2026-11-21T22:00:00Z'))).toBeNull();
    expect(huntPin(new Date('2026-11-16T19:00:00Z'))).toBeNull();
  });
});
