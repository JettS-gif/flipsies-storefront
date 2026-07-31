import { describe, it, expect } from 'vitest';
import { canContinueFulfillment, type FulfillmentReadinessInput } from './checkoutReadiness';

const base: FulfillmentReadinessInput = {
  fulfillmentType:   'delivery',
  hasSelectedSlot:   false,
  deliveryOnArrival: false,
  hasPickupStore:    false,
  hasPickupDate:     false,
};
const at = (o: Partial<FulfillmentReadinessInput>) => canContinueFulfillment({ ...base, ...o });

describe('canContinueFulfillment — delivery', () => {
  it('blocks until availability has been checked', () => {
    expect(at({})).toBe(false);
  });

  it('allows once a slot is picked', () => {
    expect(at({ hasSelectedSlot: true })).toBe(true);
  });

  // THE REGRESSION. A made-to-order cart has no slot to pick, so gating on
  // hasSelectedSlot alone greys out the button forever and blocks the sale with
  // no on-screen error — a disabled button never fires its handler, so the
  // friendly message in the submit guard is unreachable. Reported live
  // 2026-07-31 on "1157 BANK SHOT · Rocker Recliner".
  it('allows a made-to-order cart with NO slot picked', () => {
    expect(at({ deliveryOnArrival: true, hasSelectedSlot: false })).toBe(true);
  });

  it('still allows when both are somehow true', () => {
    expect(at({ deliveryOnArrival: true, hasSelectedSlot: true })).toBe(true);
  });

  it('ignores pickup fields on the delivery path', () => {
    expect(at({ hasPickupStore: true, hasPickupDate: true })).toBe(false);
  });
});

describe('canContinueFulfillment — pickup', () => {
  const p = (o: Partial<FulfillmentReadinessInput>) => at({ fulfillmentType: 'pickup', ...o });

  it('needs both store and date', () => {
    expect(p({})).toBe(false);
    expect(p({ hasPickupStore: true })).toBe(false);
    expect(p({ hasPickupDate: true })).toBe(false);
    expect(p({ hasPickupStore: true, hasPickupDate: true })).toBe(true);
  });

  // A pickup is collected in person, so the made-to-order deferral — which is
  // about a DELIVERY we cannot schedule or price yet — must not wave it through
  // without a store and date.
  it('deliveryOnArrival does not unlock the pickup path', () => {
    expect(p({ deliveryOnArrival: true })).toBe(false);
  });
});
