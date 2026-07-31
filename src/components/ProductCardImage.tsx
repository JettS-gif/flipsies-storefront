'use client';

import { useState } from 'react';
import { thumb } from '@/lib/img';
import { pickImageFit } from '@/lib/imageFit';

/**
 * The grid card's product photo, with adaptive fill.
 *
 * A deliberately tiny client boundary. ProductCard stays a server component —
 * only the <img> needs to run on the client, because the fill decision depends
 * on the photo's real dimensions and those aren't known until it loads. Making
 * the whole card 'use client' to get one event handler would cost server
 * rendering across the entire grid.
 *
 * Starts at `contain` so the first paint can never crop, then upgrades to
 * `cover` once naturalWidth/naturalHeight prove the crop is cheap. See
 * lib/imageFit.ts for why the threshold is where it is.
 */
export default function ProductCardImage({ src, alt }: { src: string; alt: string }) {
  const [fit, setFit] = useState<'cover' | 'contain'>('contain');

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // Server-side resize (aspect-preserving, width-only) — the grid card
      // renders ~300px, so downscaling a 1400px showroom photo in-browser
      // aliases (grainy). 600px stays crisp on retina at a fraction of the bytes.
      src={thumb(src, { width: 600 })}
      alt={alt}
      onLoad={(e) => {
        const el = e.currentTarget;
        setFit(pickImageFit(el.naturalWidth, el.naturalHeight));
      }}
      // Padding only applies when letterboxing — a covered image should reach
      // the card edges, and insetting it would reintroduce the gap we're closing.
      className={`w-full h-full group-hover:scale-105 transition-transform duration-300 ${
        fit === 'cover' ? 'object-cover' : 'object-contain p-2'
      }`}
    />
  );
}
