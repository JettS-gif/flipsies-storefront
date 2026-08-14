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
  /**
   * Delivery + assembly is an ADDED charge on top of the product price. Stated
   * as its own flag because the word "included" was doing two different jobs on
   * this site and one of them was false (Jett, 2026-08-14):
   *   TRUE  — assembly is included WITHIN white-glove service (see below).
   *   FALSE — included in the price on the product card, i.e. free.
   * The trust block next to Add to Cart said "included" while /delivery said
   * "quoted at checkout, $99–$249", so a customer met a charge they had been
   * told was covered. Worse in combination: a shopper who already believes
   * delivery is free reads "and assembly included as well" as a second free
   * thing. Anything asserting what the product price covers reads THIS flag.
   */
  includedInProductPrice: false,
  /**
   * SOURCE OF TRUTH: DeliverDeskBackEnd/utils/extendedDelivery.js + the bands
   * pushed to Merchant Center by scripts/set-google-shipping.js. These are a
   * MIRROR — if the rate moves there, move it here in the same change.
   *
   * The rate (Jett, 2026-08-06): $199 flat inside 50 miles of Irondale, then $2
   * per mile of ROUND-TRIP travel (so `distance * 4`) out to 100 miles, and
   * beyond 100 it is not quoted at all — that is a freight conversation, and a
   * wrong number is worse than "call us" because the wrong number is a promise.
   * Continuous at the boundary: 50 miles yields $200 against the $199 flat.
   *
   * ⚠ This page previously read "$99 – $249", written 2026-04-06 (8995f51) and
   * never updated when the rate changed on 2026-08-06 — stale by four months.
   * On 2026-08-14 that stale $99 was propagated into the trust block next to
   * Add to Cart, i.e. quoted to every shopper on every product page at roughly
   * half the real floor, while fixing a different misleading-price bug. Hence
   * the mirror note above: this number reaches customers, so it gets checked
   * against the engine, not copied from whatever the nearest page happens to say.
   */
  feeFlatUnder50Usd: 199,
  feeMaxQuotedUsd: 400,
  quotedMaxMiles: 100,
  /**
   * Included WITHIN white-glove service — never a separate line on top of the
   * delivery fee. NOT "free": the delivery fee itself still applies. This is
   * also the basis of the price-match like-for-like clause, so it must survive
   * any rewording of the fee copy.
   */
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

/**
 * The four lines that go next to Add to Cart. Positives first, honestly.
 *
 * Simplified 2026-08-14 (Jett: "easier for a human mind to handle"). Delivery
 * and white-glove used to be two separate lines, the second carrying a "from
 * $199" figure. Two problems with the figure: it made the block read as a rate
 * card at the moment someone is deciding on a sofa, and it is only true inside
 * 50 miles — past that the real number climbs to $400, so the one shopper most
 * misled by a from-price was the one furthest away.
 *
 * The lines now say delivery is available and pickup is free, and the CTA under
 * them sends anyone who wants a number to the availability checker, which
 * quotes their actual address. Stating that delivery HAS pricing (via the CTA
 * label) is what keeps this honest without printing a figure — see
 * DELIVERY.includedInProductPrice for why that matters here.
 */
export const TRUST_POINTS = [
  { icon: '🚚', text: `White-glove in-home delivery in ${DELIVERY.inStockBusinessDays} business days — in-stock items` },
  { icon: '🏬', text: 'Warehouse pickup — available free' },
  { icon: '🏷', text: `Price match — any competitor within ${PRICE_MATCH.radiusMiles} miles, ${PRICE_MATCH.withinDays} days` },
  { icon: '🔁', text: `Arrived damaged? Swapped within ${RETURNS.defectiveSwapHours} hours` },
] as const;
