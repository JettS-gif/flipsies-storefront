/**
 * "May this cart continue from the fulfillment step to payment?"
 *
 * Extracted from checkout/page.tsx after a real failure. The rule lived in TWO
 * places — the submit handler and the Continue button's `disabled` prop. When
 * made-to-order carts were taught that they need no delivery slot, only the
 * handler was updated; the button still required `selectedSlot`. So the page
 * rendered the correct "we'll schedule on arrival" panel and the button stayed
 * greyed out, with no error to explain it — because a disabled button never
 * fires its handler. The sale was silently blocked.
 *
 * It lives in src/lib so it is inside the storefront's test scope (components
 * would need jsdom, which isn't installed). Keep it as the ONLY definition of
 * this rule.
 */

export type FulfillmentType = 'delivery' | 'pickup';

export interface FulfillmentReadinessInput {
  fulfillmentType: FulfillmentType;
  /** True when a delivery slot chip has been picked. */
  hasSelectedSlot: boolean;
  /**
   * True when availability came back `delivery_on_arrival` — the cart holds a
   * made-to-order line, so there is no slot to pick and delivery is quoted and
   * billed when the goods land.
   */
  deliveryOnArrival: boolean;
  /**
   * True when availability came back `extended_delivery` — the address is past
   * the 50-mile range but inside the freight threshold, so the backend has
   * quoted a round-trip estimate and we schedule by hand afterwards.
   *
   * Same shape as deliveryOnArrival and here for the same reason: there is no
   * slot to pick, and requiring one turns a willing buyer into a dead end. It
   * was one — checkout/page.tsx called it "out_of_range: call us dead end", and
   * on 2026-08-06 a shopper carted a Shari table set, reached checkout, came
   * back four hours later, tried again, and could not buy at any price.
   */
  extendedDelivery: boolean;
  /** Pickup path only. */
  hasPickupStore: boolean;
  hasPickupDate: boolean;
}

export function canContinueFulfillment(i: FulfillmentReadinessInput): boolean {
  if (i.fulfillmentType === 'delivery') {
    // Either a real slot, or one of the two explicit "there is no slot to pick"
    // answers: made-to-order (billed on arrival) and extended range (quoted at
    // the round-trip rate, scheduled by hand).
    return i.hasSelectedSlot || i.deliveryOnArrival || i.extendedDelivery;
  }
  return i.hasPickupStore && i.hasPickupDate;
}
