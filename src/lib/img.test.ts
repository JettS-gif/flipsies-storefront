import { describe, it, expect } from 'vitest';
import { thumb } from './img';

// thumb() rewrites Supabase public-object URLs to the image-transform endpoint.
// It runs on essentially every product image on the site, so a regression here
// is a sitewide visual failure — either every thumbnail 404s, or every one
// silently falls back to downloading full-size showroom photos on a browse grid
// (slow, and the aliasing this function exists to fix comes back).
//
// The two behaviours worth pinning are the pass-through (a non-Supabase URL
// must survive untouched) and the crop rule: a lone width must NOT set
// `resize`, because that would square-crop landscape sofa photos on cards.

const SUPA = 'https://abc.supabase.co/storage/v1/object/public/product-images/sofa.jpg';

const q = (url: string) => new URL(url).searchParams;

describe('thumb', () => {
  it('rewrites a Supabase public object URL to the render endpoint', () => {
    const out = thumb(SUPA, 160);
    expect(out).toContain('/storage/v1/render/image/public/product-images/sofa.jpg');
    expect(out).not.toContain('/object/public/');
  });

  it('leaves a non-Supabase URL completely alone', () => {
    for (const url of [
      'https://cdn.vendor.com/img/sofa.jpg',
      'https://example.com/storage/v1/render/image/public/already.jpg',
      '/local/relative.png',
      '',
    ]) {
      expect(thumb(url, 160)).toBe(url);
    }
  });

  it('preserves the origin so a self-hosted Supabase still resolves', () => {
    const out = thumb(SUPA, 160);
    expect(out.startsWith('https://abc.supabase.co/')).toBe(true);
  });

  // A number means "square chip": both dimensions constrain, so cover-crop.
  it('a numeric arg produces a square cover-cropped chip', () => {
    const p = q(thumb(SUPA, 64));
    expect(p.get('width')).toBe('64');
    expect(p.get('height')).toBe('64');
    expect(p.get('resize')).toBe('cover');
  });

  // THE NO-DISTORTION RULE — this replaces an assertion that encoded a bug.
  //
  // The old test demanded `height` and `resize` be ABSENT on a width-only call,
  // on the belief that Supabase preserves aspect ratio from one dimension. It
  // does not: it returns the requested width and the ORIGINAL height. Measured
  // against production 2026-07-31, a 1400x1867 photo came back 600x1867 — every
  // grid card was serving a horizontally squashed image, which is the reported
  // "thumbnails not displaying properly".
  //
  // The old test's INTENT was right (don't square-crop a sofa) — but omitting
  // `resize` was the wrong mechanism. `contain` fits inside the box and neither
  // crops nor distorts, which satisfies the original intent properly.
  it('a width-only request still describes a box, and contains rather than crops', () => {
    const p = q(thumb(SUPA, { width: 600 }));
    expect(p.get('width')).toBe('600');
    expect(p.get('height')).toBe('600');   // filled from width — "fit inside 600x600"
    expect(p.get('resize')).toBe('contain');
  });

  it('a height-only request is symmetric', () => {
    const p = q(thumb(SUPA, { height: 400 }));
    expect(p.get('width')).toBe('400');
    expect(p.get('height')).toBe('400');
    expect(p.get('resize')).toBe('contain');
  });

  it('never emits a request that can distort — a resize mode is always set', () => {
    for (const opts of [160, { width: 600 }, { height: 400 }, { width: 300, height: 200 }] as const) {
      expect(q(thumb(SUPA, opts)).get('resize')).not.toBeNull();
    }
  });

  it('honours an explicit resize', () => {
    expect(q(thumb(SUPA, { width: 300, height: 200, resize: 'contain' })).get('resize')).toBe('contain');
    expect(q(thumb(SUPA, { width: 300, height: 200, resize: 'cover' })).get('resize')).toBe('cover');
    // cover stays opt-in: the square swatch chip wants a centre crop, a card does not.
    expect(q(thumb(SUPA, { width: 600 })).get('resize')).toBe('contain');
  });

  it('defaults quality to 80 and lets it be overridden', () => {
    expect(q(thumb(SUPA, 160)).get('quality')).toBe('80');
    expect(q(thumb(SUPA, { width: 600, quality: 60 })).get('quality')).toBe('60');
  });

  it('defaults to a 160px square when no options are passed', () => {
    const p = q(thumb(SUPA));
    expect(p.get('width')).toBe('160');
    expect(p.get('height')).toBe('160');
  });

  // Paths with folders/spaces/query strings must survive the split.
  it('keeps a nested object path intact', () => {
    const nested = 'https://abc.supabase.co/storage/v1/object/public/product-images/vendor/somo/123-45.jpg';
    expect(thumb(nested, 100)).toContain('render/image/public/product-images/vendor/somo/123-45.jpg');
  });
});
