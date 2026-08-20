import { describe, it, expect } from 'vitest';
import { thumb, bucketFor, BUCKETS } from './img';

// thumb() addresses PRE-GENERATED derivatives (2026-08-20). It used to build
// `/storage/v1/render/image/…` URLs and pay per transformation; it now points at
// files the backfill wrote once, offline.
//
// It runs on essentially every product image on the site, so a regression is a
// sitewide visual failure — but the failure mode has changed, and that is what
// these tests are shaped around. Before, a bug meant a distorted or oversized
// image. Now a bug means a 400: the derived path is computed by pure string
// manipulation, with no catalog to check against, so a path this function builds
// either matches a real object or it does not.
//
// THE CRITICAL TEST is `matches the paths the backfill actually writes`. The
// naming rule lives in TWO repos — here and in
// `DeliverDeskBackEnd/scripts/backfill-image-derivatives.js` (derivedPath +
// SIZES). One rule with two implementations is this codebase's most common bug
// class, and here the two halves cannot even see each other. So the expected
// strings below are written out literally rather than derived from a shared
// constant: if either side's rule changes, this fails loudly instead of the
// storefront quietly serving broken images.

const SUPA = 'https://abc.supabase.co/storage/v1/object/public/product-images/sofa.jpg';
const DERIVED = 'https://abc.supabase.co/storage/v1/object/public/product-images/_derived';

describe('thumb', () => {
  it('matches the paths the backfill actually writes', () => {
    // Literal expectations, deliberately not built from BUCKETS or a helper.
    expect(thumb(SUPA, 160)).toBe(`${DERIVED}/160/sofa.jpg`);
    expect(thumb(SUPA, { width: 600 })).toBe(`${DERIVED}/600/sofa.jpg`);
    expect(thumb(SUPA, { width: 1200 })).toBe(`${DERIVED}/1200/sofa.jpg`);
  });

  it('normalises the extension to .jpg, because derivatives are always JPEG', () => {
    // Not cosmetic: the transform endpoint was doubling as a format normaliser
    // for the ~198 AVIF originals Google rejects as image_link_broken. Losing
    // that would silently re-break those feed rows.
    const base = 'https://abc.supabase.co/storage/v1/object/public/product-images/';
    for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'avif', 'JPG']) {
      expect(thumb(`${base}chair.${ext}`, 600)).toBe(`${DERIVED}/600/chair.jpg`);
    }
  });

  it('keeps a nested object path intact under the size folder', () => {
    const nested = 'https://abc.supabase.co/storage/v1/object/public/product-images/vendor/somo/123-45.jpg';
    expect(thumb(nested, 600)).toBe(`${DERIVED}/600/vendor/somo/123-45.jpg`);
  });

  it('leaves a non-Supabase URL completely alone', () => {
    for (const url of [
      'https://cdn.vendor.com/img/sofa.jpg',
      '/local/relative.png',
      '',
    ]) {
      expect(thumb(url, 160)).toBe(url);
    }
  });

  it('leaves other buckets alone — only product-images was backfilled', () => {
    // Rewriting a bucket with no derivatives would be a guaranteed 400.
    const other = 'https://abc.supabase.co/storage/v1/object/public/feedback-images/shot.png';
    expect(thumb(other, 600)).toBe(other);
  });

  it('is idempotent — never derives a derivative', () => {
    // A double application would produce `_derived/600/_derived/600/…`. This is
    // reachable in practice: an already-thumbed URL can be passed through a
    // second component.
    const once = thumb(SUPA, 600);
    expect(thumb(once, 600)).toBe(once);
  });

  it('preserves the origin so a self-hosted Supabase still resolves', () => {
    expect(thumb(SUPA, 160).startsWith('https://abc.supabase.co/')).toBe(true);
  });

  it('defaults to the chip bucket when no options are passed', () => {
    expect(thumb(SUPA)).toBe(`${DERIVED}/160/sofa.jpg`);
  });
});

describe('bucketFor', () => {
  it('maps every size the call sites request to a bucket that exists', () => {
    // The eight sizes that were in use before the collapse.
    expect(bucketFor(128)).toBe(160);
    expect(bucketFor(160)).toBe(160);
    expect(bucketFor(200)).toBe(160);
    expect(bucketFor(300)).toBe(600);
    expect(bucketFor(600)).toBe(600);
    expect(bucketFor(1200)).toBe(1200);
    expect(bucketFor(1600)).toBe(1200);
  });

  it('only ever returns a bucket that was actually built', () => {
    for (let w = 1; w <= 2400; w += 7) {
      expect(BUCKETS).toContain(bucketFor(w));
    }
  });

  it('clamps above the largest bucket rather than falling back to the original', () => {
    // Serving a full-resolution original on a PDP hero is the egress problem
    // this project exists to fix, so oversized requests round DOWN to 1200.
    expect(bucketFor(4000)).toBe(1200);
  });

  it('uses the larger dimension so a box is never served a file too small', () => {
    expect(thumb(SUPA, { width: 100, height: 1200 })).toBe(`${DERIVED}/1200/sofa.jpg`);
    expect(thumb(SUPA, { height: 600 })).toBe(`${DERIVED}/600/sofa.jpg`);
  });
});
