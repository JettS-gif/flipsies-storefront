import { describe, it, expect } from 'vitest';
import { isCompleteBed, splitBySize, huntPin } from './bedDeals';
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

describe('hunt PIN window (Sat 2026-11-21, 12:00–16:00 CST)', () => {
  it('is hidden before, shown during, hidden after', () => {
    expect(huntPin(new Date('2026-11-21T17:59:59Z'))).toBeNull();
    expect(huntPin(new Date('2026-11-21T18:00:00Z'))).toBe('SNOOZE');
    expect(huntPin(new Date('2026-11-21T21:59:59Z'))).toBe('SNOOZE');
    expect(huntPin(new Date('2026-11-21T22:00:00Z'))).toBeNull();
    expect(huntPin(new Date('2026-11-16T19:00:00Z'))).toBeNull();
  });
});
