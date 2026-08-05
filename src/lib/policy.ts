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
   * Restocking turns on PACKAGING, not on the clock (Jett, 2026-08-05).
   *
   * An earlier draft tiered this by time — 10% inside 48 hours, 20% after. Time
   * was only ever a proxy for the real question, which is whether we can still
   * sell the piece as new. Factory packaging answers that directly: a sealed box
   * back on day five costs us nothing in resale, while an opened one at hour
   * twelve is out of the box permanently, goes back on a warehouse floor where
   * it can be scuffed or soiled, and can never be described as factory-fresh to
   * the next customer.
   *
   * So the rule is one sentence a salesperson can say and a customer can check:
   * still sealed, no restocking fee. Opened, restocking applies.
   *
   * Three axes, each doing one job:
   *   condition -> a GATE (eligible at all, or not)
   *   packaging -> whether restocking applies
   *   collection -> a separate fee, priced by the delivery engine
   */
  restockingWaivedIfSealed: true,
  /** Applies to any out-of-box return. Also the figure published in schema. */
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
   * Bringing it back to a showroom costs nothing.
   *
   * A collection is priced by the SAME engine that quoted the delivery — a
   * pickup is the same truck over the same distance into the same slot, so the
   * variables are identical and there is no reason to invent a second pricing
   * model (Jett, 2026-08-05). That is also why no figure is published here: the
   * delivery fee is per-address, so the collection fee is too.
   *
   * Waived entirely on an exchange we can carry both ways on one trip — the
   * crew is already going.
   */
  returnInStoreFree: true,
  collectionPricedBy: 'the same availability engine that quoted your delivery',
  excluded: ['Custom orders', 'Floor models', 'Clearance'],
} as const;

/**
 * merchantReturnDays for schema.org. Derived rather than typed twice so the
 * page copy and the structured data cannot disagree about the window.
 */
export const RETURN_WINDOW_DAYS = RETURNS.changeOfMindDays;

/**
 * The defensible middle — and the reason the rest of this policy will actually
 * get enforced.
 *
 * Jett, 2026-08-05: "When bad publicity or law suits come in we are cowards."
 * That is not a discipline problem, it is a structural one. Until now the only
 * two outcomes were FULL REFUND or NOTHING, and "nothing" is impossible to hold
 * when someone threatens a review or a lawyer — so every hard case collapsed to
 * "everything". The $2,800 wardrobe settled at a 20% restocking fee on an
 * unsellable piece for exactly this reason.
 *
 * A third option fixes it. When a piece is genuinely not returnable — damaged
 * in the home, waiver signed, outside the window — we can still put it into
 * clearance and credit the customer what it actually sells for. The customer
 * gets something, we lose the clearance delta instead of the whole ticket, and
 * the sentence reads as generous rather than punitive if it ends up in a public
 * review.
 *
 * It is PUBLISHED deliberately. A concession that appears only when someone
 * shouts is a negotiation, and it teaches the next customer to shout. A
 * concession written on the policy page is just the policy.
 */
export const GOODWILL = {
  heading: 'When something is not returnable',
  offer:
    'we can take it into our clearance floor and credit you what it sells for, ' +
    'and put that toward something that does work',
} as const;

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
   *
   * The waiver ALSO ends the return right, and that has to be said out loud at
   * signing — it is the single most expensive gap we have found. Real case,
   * week of 2026-08-05: a $2,800 wardrobe, crew told the customer it would not
   * fit, he signed the waiver to try anyway, the house AND the piece were
   * damaged, he asked for a full refund, and we settled at a 20% restocking fee
   * on an item that was by then unsellable. That is roughly $2,240 lost on a
   * delivery our own crew had already advised against.
   *
   * Under this policy that return is not eligible at all — damage in the home
   * fails the condition gate — but a policy only holds if the customer agreed
   * to it at the moment of risk, in writing, rather than reading it afterwards.
   */
  damageWaiverOnRiskyDelivery: true,
  waiverEndsReturnRight: true,
  spaceReadyExpected: true,
} as const;

/** The four lines that go next to Add to Cart. Positives first, honestly. */
export const TRUST_POINTS = [
  { icon: '🚚', text: `Delivered in ${DELIVERY.inStockBusinessDays} business days — in-stock items` },
  { icon: '🛋', text: 'White-glove in-home placement and assembly, included' },
  { icon: '🏷', text: `Price match — any competitor within ${PRICE_MATCH.radiusMiles} miles, ${PRICE_MATCH.withinDays} days` },
  { icon: '🔁', text: `Arrived damaged? Swapped within ${RETURNS.defectiveSwapHours} hours` },
] as const;
