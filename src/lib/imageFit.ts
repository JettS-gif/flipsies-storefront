/**
 * Choose `object-cover` vs `object-contain` for a product image in a fixed-aspect
 * card, based on how much of the photo cropping would actually destroy.
 *
 * WHY THIS EXISTS. The catalog's photos are not one shape. A spread sample of 22
 * products measured 45% landscape, 32% square and 18% portrait, spanning 0.44
 * (a tall narrow lamp) to 2.52 (a wide panel). No single card aspect fits that,
 * so the grid used `object-contain` everywhere — which never crops, but
 * letterboxes a portrait photo down to ~56% of the card and reads as "the
 * thumbnail is broken" (reported 2026-07-31 against SoMo 2157, a 1400x1867
 * showroom shot).
 *
 * Blanket `object-cover` is not the answer either: it would fill every card, but
 * crop 44% of that recliner's height — cutting off its head and base — and
 * mangle the 0.44 and 2.52 outliers entirely.
 *
 * So: cover when the crop is small enough to be invisible, contain otherwise.
 * A photo close to the card's shape fills it edge-to-edge and looks deliberate;
 * a genuinely mis-shaped photo stays whole and gets flagged for a real image
 * (scripts/audit-product-image-aspect.js) rather than being silently butchered.
 */

/** The grid card's box: 4:3 landscape (ProductCard `aspect-[4/3]`). */
export const CARD_ASPECT = 4 / 3;

/**
 * Most of the shorter dimension we're willing to lose to a centre-crop.
 *
 * 0.2 lets true landscape photos (≈1.29–1.52, the bulk of the catalog) fill the
 * card, while a square photo (crop 25%) and anything more extreme keeps
 * `contain`. Raising this past ~0.25 starts clipping product edges on square
 * shots, which is the failure the old aspect-square card had.
 */
export const MAX_CROP = 0.2;

/**
 * Fraction of the image lost to a centre-crop when filling a box.
 * Symmetric: it doesn't matter whether the photo is too tall or too wide.
 * Returns 0 for an exact match, approaching 1 as the shapes diverge.
 */
export function cropFraction(imageAspect: number, boxAspect: number = CARD_ASPECT): number {
  if (!(imageAspect > 0) || !(boxAspect > 0)) return 1;
  return 1 - Math.min(imageAspect, boxAspect) / Math.max(imageAspect, boxAspect);
}

/**
 * `cover` only when cropping costs less than MAX_CROP. Unknown or nonsense
 * dimensions fall back to `contain` — the safe answer, since it can never
 * destroy part of the product.
 */
export function pickImageFit(
  naturalWidth: number,
  naturalHeight: number,
  boxAspect: number = CARD_ASPECT,
  maxCrop: number = MAX_CROP,
): 'cover' | 'contain' {
  if (!(naturalWidth > 0) || !(naturalHeight > 0)) return 'contain';
  return cropFraction(naturalWidth / naturalHeight, boxAspect) <= maxCrop ? 'cover' : 'contain';
}
