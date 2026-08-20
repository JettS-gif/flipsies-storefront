// Point a product image at a PRE-GENERATED derivative instead of asking Supabase
// to transform it on the fly.
//
// Until 2026-08-20 this rewrote every URL to `/storage/v1/render/image/…`, which
// bills per transformation. At catalog scale that is not a tuning problem: 5,317
// distinct images across 8 requested sizes is a ceiling of ~63,000 transforms
// against a Pro quota of 100, and the account sat at 5,326/100. The derivatives
// are now built once, offline, by
// `DeliverDeskBackEnd/scripts/backfill-image-derivatives.js`, and this function
// just addresses them. Transformations go to zero.
//
// THE PATH RULE IS DUPLICATED ACROSS TWO REPOS — that is the risk here, and it
// is the exact shape of most bugs in this codebase (one rule, two
// implementations, silently drifting). The backfill writes
// `_derived/<size>/<path>` with the extension normalised to `.jpg`; this file
// must reproduce that string EXACTLY, because it has no catalog to consult and
// no way to check whether a file exists. `img.test.ts` pins the mapping against
// the literal paths the backfill produces — if you change one side, that test
// fails rather than the storefront quietly serving 400s.
//
// Non-Supabase URLs (and anything already derived) pass through unchanged.

const OBJECT = '/storage/v1/object/public/';
const DERIVED_ROOT = '_derived';

// Only this bucket was backfilled. Any other bucket has no derivatives at all,
// so rewriting its URLs would produce a guaranteed 400.
const DERIVED_BUCKET = 'product-images';

// Three buckets, collapsed from the eight sizes the call sites used to request.
// 160 is a square centre crop; 600 and 1200 are aspect-preserving. That is a
// property of the FILE now, not of the request — see the backfill's SIZES.
export const BUCKETS = [160, 600, 1200] as const;
export type Bucket = (typeof BUCKETS)[number];

/**
 * Requested width → the bucket that serves it.
 *
 * Deliberately "round UP to a bucket that is at least as large", so a derivative
 * is never asked to upscale into a box bigger than itself — with one exception:
 * anything above 1200 clamps to 1200, because that is the largest file we built
 * and the alternative (falling back to a full-resolution original on a PDP hero)
 * is the egress problem this project exists to fix.
 *
 * 200 → 160 rather than 600 is the one place this rounds DOWN, and it is
 * measured, not assumed: the only 200 call site is the cart line item, whose box
 * is w-20/sm:w-24 — 80–96 CSS px. A 160 file is still ~2x retina there, while
 * 600 would be ~14x the bytes for a thumbnail nobody inspects.
 */
export function bucketFor(requested: number): Bucket {
  if (requested <= 200) return 160;
  if (requested <= 600) return 600;
  return 1200;
}

type ThumbOpts = { width?: number; height?: number };

/**
 * The derived-object URL for a product image at the requested size.
 *
 * `resize` and `quality` are gone from the options on purpose. They used to be
 * request parameters; they are now baked into the file at build time (160 =
 * cover, 600/1200 = contain, quality 80/80/85). Accepting them here would let a
 * caller ask for something this function cannot deliver.
 *
 * Returns the URL UNCHANGED when it cannot be mapped — a foreign CDN, a relative
 * path, a non-product bucket, or a URL that is already derived. Callers render
 * the result directly, so "unchanged" degrades to the original image rather than
 * to a broken one.
 *
 * A derivative that does not exist yet (any photo uploaded after the backfill)
 * still 400s. That is handled at the render layer by `CatalogImage`, which
 * swaps back to the original on error — this function cannot know, because it
 * is pure string manipulation with no way to probe storage.
 */
export function thumb(url: string, opts: number | ThumbOpts = 160): string {
  if (!url) return url;
  const i = url.indexOf(OBJECT);
  if (i === -1) return url; // not a Supabase public object URL — leave as-is

  const origin = url.slice(0, i);
  const rest = url.slice(i + OBJECT.length); // "<bucket>/<object path>"

  const slash = rest.indexOf('/');
  if (slash === -1) return url; // bucket with no object path — nothing to map
  const bucket = rest.slice(0, slash);
  const objectPath = rest.slice(slash + 1);

  if (bucket !== DERIVED_BUCKET) return url;
  // Already a derivative. Re-deriving would produce `_derived/600/_derived/…`.
  if (objectPath.startsWith(`${DERIVED_ROOT}/`)) return url;

  // A number has always meant "square chip"; an object constrains a box. Either
  // way the bucket is chosen off the larger requested dimension, so a box is
  // never served a file too small for its longest side.
  const requested = typeof opts === 'number'
    ? opts
    : Math.max(opts.width || 0, opts.height || 0) || 160;

  const size = bucketFor(requested);

  // Extension → .jpg, because the backfill always encodes JPEG. That is not
  // cosmetic: the transform endpoint was quietly acting as a format normaliser
  // for the ~198 AVIF originals Google rejects as `image_link_broken`, and the
  // derivatives preserve that job.
  const derivedPath = `${objectPath.replace(/\.[a-z0-9]+$/i, '')}.jpg`;

  return `${origin}${OBJECT}${bucket}/${DERIVED_ROOT}/${size}/${derivedPath}`;
}
