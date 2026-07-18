// Serve a Supabase-stored image through the storage image-transform endpoint so
// the browser isn't downscaling a large photo into a tiny box. A 1400px showroom
// photo squeezed to a 64px chip by the browser aliases badly (reads "grainy");
// a server-side resize to ~thumbnail size is crisp. Non-Supabase URLs (or an
// already-transformed one) pass through unchanged.
const OBJECT = '/storage/v1/object/public/';

export function thumb(url: string, size = 160): string {
  const i = url.indexOf(OBJECT);
  if (i === -1) return url; // not a Supabase public object URL — leave as-is
  const origin = url.slice(0, i);
  const path = url.slice(i + OBJECT.length);
  return `${origin}/storage/v1/render/image/public/${path}?width=${size}&height=${size}&resize=cover&quality=80`;
}
