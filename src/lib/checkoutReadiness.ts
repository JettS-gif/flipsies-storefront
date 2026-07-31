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
  /** Pickup path only. */
  hasPickupStore: boolean;
  hasPickupDate: boolean;
}

export function canContinueFulfillment(i: FulfillmentReadinessInput): boolean {
  if (i.fulfillmentType === 'delivery') {
    // Either a real slot, or an explicit "there is no slot to pick".
    return i.hasSelectedSlot || i.deliveryOnArrival;
  }
  return i.hasPickupStore && i.hasPickupDate;
}
