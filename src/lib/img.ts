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
  const params = new URLSearchParams();
  if (o.width) params.set('width', String(o.width));
  if (o.height) params.set('height', String(o.height));
  // resize mode only applies when both dimensions constrain the box; with a lone
  // width Supabase already keeps aspect ratio, so omit it to avoid a needless crop.
  if (o.width && o.height && o.resize) params.set('resize', o.resize);
  params.set('quality', String(o.quality ?? 80));
  return `${origin}/storage/v1/render/image/public/${path}?${params.toString()}`;
}
