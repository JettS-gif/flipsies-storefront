'use client';

import CatalogImage from './CatalogImage';

/**
 * The grid card's product photo.
 *
 * The adaptive-fill behaviour and the derivative fallback both live in
 * CatalogImage now — this stayed a separate component only because ProductCard
 * imports it by name and the grid is the highest-traffic image on the site, so
 * a rename would be churn for nothing. It is a thin alias, not a second
 * implementation.
 *
 * 600 is the browse-card bucket: the card renders ~300px, and downscaling a
 * 1400px showroom photo in-browser aliases badly, while 600 stays crisp on
 * retina at a fraction of the bytes.
 */
export default function ProductCardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <CatalogImage
      src={src}
      alt={alt}
      width={600}
      adaptiveFit
      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
    />
  );
}
