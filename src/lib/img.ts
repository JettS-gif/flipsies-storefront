// Serve a Supabase-stored image through the storage image-transform endpoint so
// the browser isn't downscaling a large photo into a tiny box. A 1400px showroom
// photo squeezed to a 64px chip by the browser aliases badly (reads "grainy");
// a server-side resize to ~thumbnail size is crisp. Non-Supabase URLs (or an
// already-transformed one) pass through unchanged.
const OBJECT = '/storage/v1/object/public/';

type ThumbOpts = { width?: number; height?: number; resize?: 'cover' | 'contain' | 'fill'; quality?: number };

// Pass a number for a square cover-cropped chip (ColorSelector). Pass an options
// object for aspect-preserving resizes — e.g. `{ width: 600 }` scales to 600px
// wide and derives the height, so a landscape sofa photo is NOT cropped square
// (the browse card shows the whole product in a 4:3 object-contain box).
export function thumb(url: string, opts: number | ThumbOpts = 160): string {
  const i = url.indexOf(OBJECT);
  if (i === -1) return url; // not a Supabase public object URL — leave as-is
  const origin = url.slice(0, i);
  const path = url.slice(i + OBJECT.length);
  const o: ThumbOpts = typeof opts === 'number'
    ? { width: opts, height: opts, resize: 'cover' }
    : opts;
  // ALWAYS send both dimensions and an explicit resize mode.
  //
  // The previous version sent a lone `width` on the belief that "Supabase already
  // keeps aspect ratio" with one dimension. IT DOES NOT — it returns the
  // requested width and the ORIGINAL height, i.e. a horizontally squashed image.
  // Measured against production 2026-07-31:
  //
  //   1400x1867 (0.75)  ?width=600                        -> 600x1867 (0.32)  SQUASHED
  //   1200x1200 (1.00)  ?width=600                        -> 600x1200 (0.50)  SQUASHED
  //   1400x1867 (0.75)  ?width=600&height=600&resize=contain -> 450x600 (0.75)  correct
  //
  // Every grid card on the site was serving a distorted photo — the reported
  // "thumbnails not displaying properly", with SoMo 2157 rendering as a narrow
  // vertical sliver. The old behaviour was locked in by a test written to stop
  // square-cropping, which is a real hazard, but omitting `resize` was the wrong
  // way to avoid it: `contain` fits within the box AND preserves the ratio.
  //
  // A missing dimension is filled from the other so the request always describes
  // a box: `{ width: 600 }` means "fit inside 600x600", which is what a card
  // thumbnail wants regardless of the photo's shape.
  const width  = o.width  || o.height;
  const height = o.height || o.width;
  const params = new URLSearchParams();
  if (width)  params.set('width', String(width));
  if (height) params.set('height', String(height));
  // Default to `contain` — it can never crop and can never distort. `cover` is
  // opt-in, for the square swatch chips that deliberately want a centre crop.
  if (width && height) params.set('resize', o.resize ?? 'contain');
  params.set('quality', String(o.quality ?? 80));
  return `${origin}/storage/v1/render/image/public/${path}?${params.toString()}`;
}
