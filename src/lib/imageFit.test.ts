import { describe, it, expect } from 'vitest';
import { pickImageFit, cropFraction, CARD_ASPECT, MAX_CROP } from './imageFit';

describe('cropFraction', () => {
  it('is 0 when the photo matches the box', () => {
    expect(cropFraction(CARD_ASPECT)).toBe(0);
  });

  it('is symmetric — too tall and too wide cost the same', () => {
    // 1.0 is 1.333x from the box; 1.777 is 1.333x the other way.
    expect(cropFraction(1.0)).toBeCloseTo(cropFraction(16 / 9), 5);
  });

  it('reports the real cost on the reported case', () => {
    // SoMo 2157: 1400x1867 portrait in a 4:3 card. Cropping to fill would eat
    // ~44% of the height — the chair's head and base.
    expect(cropFraction(1400 / 1867)).toBeCloseTo(0.4375, 3);
  });

  it('treats garbage as maximally bad', () => {
    expect(cropFraction(0)).toBe(1);
    expect(cropFraction(NaN)).toBe(1);
  });
});

describe('pickImageFit — real catalog shapes', () => {
  const fit = (w: number, h: number) => pickImageFit(w, h);

  // Landscape photos are the bulk of the catalog and sit close to the card's
  // shape, so they fill it. This is the visible win.
  it('fills for typical landscape product shots', () => {
    expect(fit(1600, 1060)).toBe('cover');  // 1.51
    expect(fit(1024, 768)).toBe('cover');   // 1.33 — exact match
    expect(fit(1125, 884)).toBe('cover');   // 1.27
  });

  // THE REGRESSION GUARD. The whole point is that fixing the letterboxing must
  // not start decapitating portrait photos.
  it('never crops the reported portrait recliner', () => {
    expect(fit(1400, 1867)).toBe('contain'); // SoMo 2157
  });

  it('never crops the extremes at either end', () => {
    expect(fit(442, 1000)).toBe('contain');  // 0.44 tall lamp
    expect(fit(1400, 556)).toBe('contain');  // 2.52 wide panel
  });

  // A square photo crops 25% — past the threshold. Deliberate: clipping the
  // edges off square shots is exactly what the old aspect-square card did wrong.
  it('leaves square photos uncropped', () => {
    expect(fit(1200, 1200)).toBe('contain');
    expect(cropFraction(1)).toBeGreaterThan(MAX_CROP);
  });

  it('falls back to contain on missing or nonsense dimensions', () => {
    expect(fit(0, 0)).toBe('contain');
    expect(fit(800, 0)).toBe('contain');
    expect(fit(-5, 100)).toBe('contain');
  });

  it('honours a custom box and threshold', () => {
    // In a square card a square photo is a perfect fit.
    expect(pickImageFit(1200, 1200, 1)).toBe('cover');
    // A permissive threshold lets the portrait recliner crop — proving the
    // guard above is the threshold's doing, not an accident of the maths.
    expect(pickImageFit(1400, 1867, CARD_ASPECT, 0.5)).toBe('cover');
  });
});
