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
  /**
   * Change-of-mind window (Jett, 2026-08-05). Was 48 hours, widened to 7 days
   * once the as-delivered condition gate below was written down.
   *
   * 48 hours IS a weekend, so it did not prevent the buy-it-for-a-party case —
   * it described it. Condition is what actually catches that (a sofa hosted on
   * comes back marked), and it catches it at any window length. Meanwhile the
   * short clock punished the honest customer whose room genuinely did not work,
   * and published as merchantReturnDays: 2 against comps showing 30.
   */
  changeOfMindDays: 7,
  /**
   * Restocking is TIME-tiered, and that is the whole design. One flat number
   * charged the customer whose room did not work exactly what it charged
   * someone who held the piece a week — so it discouraged nothing and annoyed
   * the honest.
   *
   * Three axes, each doing one job:
   *   condition  -> a GATE (eligible or not), never a fee
   *   time held  -> the restocking PERCENTAGE, below
   *   collection -> a separate pickup fee, waived if they bring it in
   */
  restockingFastHours: 48,
  restockingFastPercent: 10,
  /** The standard tier, and the one published in structured data. */
  restockingFeePercent: 20,
  /**
   * Must come back in the condition it went out. This is the clause the whole
   * window exists to protect: furniture goes unsellable fast in a home. A sofa
   * came back after TWELVE HOURS carrying enough smoke and pet odour to be
   * unsellable (Jett, 2026-08-05) — which is why 48 hours, and why the fee.
   *
   * Note the collision this creates in the copy: "damaged" means opposite
   * things depending on when. Damaged ON ARRIVAL is a free swap within 24h.
   * Damaged, soiled or smoke-affected IN THE HOME voids the change-of-mind
   * return entirely. The two must never be stated in a way that blurs them, or
   * the difference gets discovered at the door.
   */
  mustBeAsDelivered: true,
  /** Deducted from the credit, not billed separately. */
  refundType: 'store credit',
  /**
   * Bringing it back to a showroom costs nothing. If we have to collect it, the
   * office quotes a pickup fee case-by-case off the delivery engine — so no
   * figure is published here. "May apply" is accurate; a number would not be.
   */
  returnInStoreFree: true,
  excluded: ['Custom orders', 'Floor models', 'Clearance'],
} as const;

/**
 * merchantReturnDays for schema.org. Derived rather than typed twice so the
 * page copy and the structured data cannot disagree about the window.
 */
export const RETURN_WINDOW_DAYS = RETURNS.changeOfMindDays;

/**
 * The single most common return is not abuse — it is someone who bought without
 * measuring and finds out days later that the piece is too big. Dozens of them
 * (Jett, 2026-08-05), and they typically expect a full refund because the real
 * costs are invisible from the customer's side: a delivery out, a collection
 * back, and a piece that is now out-of-box and cannot be sold as new.
 *
 * A fee recovers some of that. It prevents none of it. The prevention is
 * publishing dimensions and asking the question before Add to Cart — which is
 * also why `dimensions` being blank on 57% of the catalog is a returns problem
 * and not just a content gap.
 */
export const FIT_CHECK = {
  heading: 'Measure before you buy',
  points: [
    'The doorway it has to come through — height and width',
    'Any stairwell, turn or landing on the way',
    'The wall or space it is going against',
  ],
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
