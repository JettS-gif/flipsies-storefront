'use client';

import { useState } from 'react';
import { thumb } from '@/lib/img';
import { pickImageFit } from '@/lib/imageFit';

/**
 * A product photo served from a pre-generated derivative, with the original as
 * a safety net.
 *
 * WHY THIS EXISTS AT ALL. `thumb()` is pure string manipulation — it builds the
 * derivative's URL but cannot know whether that file was ever written. Two cases
 * where it has not been:
 *
 *   1. Any photo uploaded after the 2026-08-20 backfill. Staff add product
 *      images through DeliverDesk (`routes/inventory.js`), and nothing in that
 *      path generates derivatives, so every new photo starts life without one.
 *      This is ongoing, not a one-off.
 *   2. The 14 catalog images whose originals are missing from storage entirely.
 *      Those are already broken; falling back changes one broken image for
 *      another, which is no worse.
 *
 * Case 1 is the dangerous one: without a fallback, adding a product would make
 * it appear on the live storefront with no photo. That is a worse failure than
 * the transformation bill this project is fixing, so the fallback is the load-
 * bearing part of the change, not a nicety.
 *
 * A single component rather than an onError on nine <img> tags: the fallback is
 * one rule, and one rule implemented nine times is how this codebase's most
 * common bug class starts.
 *
 * The client boundary is deliberately tiny — same reasoning ProductCardImage
 * already documents. Only the <img> needs to run on the client; the cards and
 * pages around it stay server components.
 */
export default function CatalogImage({
  src,
  alt,
  width,
  className,
  loading,
  adaptiveFit = false,
}: {
  src: string;
  alt: string;
  /** Requested width in CSS px. Mapped to the nearest built bucket by thumb(). */
  width: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  /**
   * Grid cards only: start `contain` so the first paint can never crop, then
   * upgrade to `cover` once the real dimensions prove the crop is cheap.
   * Callers that already pin object-fit in `className` leave this off.
   */
  adaptiveFit?: boolean;
}) {
  // `false` until the derivative actually fails, so the common path renders the
  // small file with no extra request and no flash.
  const [useOriginal, setUseOriginal] = useState(false);
  const [fit, setFit] = useState<'cover' | 'contain'>('contain');

  const resolved = useOriginal ? src : thumb(src, width);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      loading={loading}
      onError={() => {
        // Guard against a loop: if the ORIGINAL is what just failed (case 2
        // above, or a dead vendor URL), there is nowhere further to fall back
        // to and re-setting state would re-render the same broken src forever.
        if (!useOriginal) setUseOriginal(true);
      }}
      onLoad={adaptiveFit ? (e) => {
        const el = e.currentTarget;
        setFit(pickImageFit(el.naturalWidth, el.naturalHeight));
      } : undefined}
      className={adaptiveFit
        ? `${className || ''} ${fit === 'cover' ? 'object-cover' : 'object-contain p-2'}`.trim()
        : className}
    />
  );
}
