// Customer-facing policy, in one place.
//
// These facts appear in three surfaces that MUST agree: the PDP trust block,
// the /returns and /delivery pages, and the Product JSON-LD
// (hasMerchantReturnPolicy + shippingDetails) that Google surfaces in Shopping.
// The schema half is the reason this is a module rather than page copy — an
// overstated claim there is a published commitment, not marketing.
//
// Terms confirmed by Jett 2026-08-05.

export const RETURNS = {
  /** Defective goods are swapped, not refunded — and fast. */
  defectiveSwapHours: 24,
  /** Change-of-mind exchanges carry a restocking fee. */
  restockingFeePercent: 20,
  /** Everything comes back as store credit, never cash. */
  refundType: 'store credit',
  /**
   * A pickup we have to make on a later trip is chargeable — same-day is not.
   * The amount is quoted case-by-case off the delivery engine, so no figure is
   * published; saying "may apply" is accurate, inventing a number is not.
   */
  redeliveryFeeApplies: 'when we collect the item on a later trip',
  excluded: ['Custom orders', 'Floor models', 'Clearance'],
} as const;

export const PRICE_MATCH = {
  radiusMiles: 50,
  withinDays: 30,
  /**
   * The like-for-like clause is the whole point: a competitor's sticker price
   * without white-glove delivery and assembly is not the same product.
   */
  requiresLikeForLike: true,
  excluded: ['Clearance', 'Floor models', 'As-is'],
} as const;

export const DELIVERY = {
  /** In-stock only. Made-to-order runs on the vendor's production lead time. */
  inStockBusinessDays: 2,
  assemblyIncluded: true,
  haulAwayIncluded: false,
  /**
   * We move what we sold you. We do not relocate a customer's existing
   * furniture — no "take the old one to the curb", no carrying a sofa
   * downstairs. Stated plainly because it is the single most common
   * expectation mismatch at the door.
   */
  movesExistingFurniture: false,
  /**
   * Tight doorways, stairwells and finished walls: if the crew judges that a
   * delivery risks damaging the piece or the home, the customer signs a waiver
   * before we attempt it. Better on the website than discovered on a doorstep.
   */
  damageWaiverOnRiskyDelivery: true,
  spaceReadyExpected: true,
} as const;

/** The four lines that go next to Add to Cart. Positives first, honestly. */
export const TRUST_POINTS = [
  { icon: '🚚', text: `Delivered in ${DELIVERY.inStockBusinessDays} business days — in-stock items` },
  { icon: '🛋', text: 'White-glove in-home placement and assembly, included' },
  { icon: '🏷', text: `Price match — any competitor within ${PRICE_MATCH.radiusMiles} miles, ${PRICE_MATCH.withinDays} days` },
  { icon: '🔁', text: `Arrived damaged? Swapped within ${RETURNS.defectiveSwapHours} hours` },
] as const;
