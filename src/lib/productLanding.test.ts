import { describe, it, expect } from 'vitest';
import { landingPath, normalizeProductId } from './productLanding';

describe('landingPath — where a dead product link goes (Jett: package, else frame)', () => {
  it('package first', () => {
    expect(landingPath({ kind: 'package', id: 'p1' })).toBe('/package/p1');
  });
  it('frame page next', () => {
    expect(landingPath({ kind: 'frame', id: 'f1' })).toBe('/product/f1');
  });
  it('room page with the gone banner', () => {
    expect(landingPath({ kind: 'category', room: 'Bedroom', category: 'Bed' })).toBe('/shop/bedroom?gone=1');
    expect(landingPath({ kind: 'category', room: 'Office', category: null })).toBe('/shop/office?gone=1');
  });
  it('unknown room → plain /shop', () => {
    expect(landingPath({ kind: 'category', room: null, category: 'Lamp' })).toBe('/shop');
  });
  it('no landing → null (a real 404 stays a 404)', () => {
    expect(landingPath(null)).toBe(null);
  });
});

describe('normalizeProductId — junk stuck to a pasted link', () => {
  const id = '4b2385ed-32a9-44bc-aeb1-8012f49d09f9';
  it('strips a trailing encoded quote (seen live)', () => {
    expect(normalizeProductId(id + '%22')).toBe(id);
  });
  it('strips trailing punctuation', () => {
    expect(normalizeProductId(id + ').')).toBe(id);
  });
  it('leaves a clean id and a non-uuid slug alone', () => {
    expect(normalizeProductId(id)).toBe(id);
    expect(normalizeProductId('lil-diva-full-bed')).toBe('lil-diva-full-bed');
  });
});
