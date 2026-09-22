import { describe, it, expect } from 'vitest';
import { shownResultCount } from './resultCount';

describe('shownResultCount', () => {
  it('counts products when that is all there is', () => {
    expect(shownResultCount(18, 0, 0)).toBe(18);
  });

  // The bug this file exists for. Sectional pieces are kept out of the grid, so
  // a collection-name search has a product count of 0 while a family card is on
  // screen — "turner" showed the Turner Sectional above "0 products found".
  it('a family-only match is a result, not a zero', () => {
    expect(shownResultCount(0, 1, 0)).toBe(1);
  });

  it('counts packages, which the grid also does not hold', () => {
    expect(shownResultCount(0, 0, 3)).toBe(3);
  });

  it('adds all three when a search hits every surface', () => {
    expect(shownResultCount(12, 2, 1)).toBe(15);
  });

  // A genuinely dead search must still read as dead — this is the unmet-demand
  // signal the website panel is built on, and inflating it would destroy the
  // data that tells Jett what to stock.
  it('still reports zero when nothing matched', () => {
    expect(shownResultCount(0, 0, 0)).toBe(0);
  });

  it('treats missing counts as zero rather than NaN', () => {
    expect(shownResultCount(undefined as unknown as number, 1, 0)).toBe(1);
  });
});
