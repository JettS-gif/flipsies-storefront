import { describe, it, expect } from 'vitest';
import { money, orderDate, statusLabel, fulfillmentLabel, deliveryStatusLabel } from './orderLabels';

// These render on the customer's order-status page — the screen someone opens
// when they're already anxious about a delivery. The bar is low but the failure
// is disproportionately visible: "$NaN", "Invalid Date", or a raw enum like
// `awaiting_vendor_ack` staring back at a customer.

describe('money', () => {
  it('formats as USD currency', () => {
    expect(money(1299.97)).toBe('$1,299.97');
    expect(money(0)).toBe('$0.00');
  });

  it('groups thousands', () => {
    expect(money(12345.6)).toBe('$12,345.60');
  });

  it('always shows two decimal places', () => {
    expect(money(5)).toBe('$5.00');
    expect(money(5.1)).toBe('$5.10');
  });

  it('renders a refund/credit as negative rather than dropping the sign', () => {
    expect(money(-250)).toMatch(/250\.00/);
    expect(money(-250)).toMatch(/^[-(]|-\$/);
  });
});

describe('orderDate', () => {
  it('formats an ISO date for a customer', () => {
    expect(orderDate('2026-07-31T00:00:00Z')).toMatch(/(Jul|Aug) \d{1,2}, 2026/);
  });

  // The three ways a bad date reaches this: a null column, an empty string, and
  // a value that isn't a date at all. None may render "Invalid Date".
  it('returns empty string rather than "Invalid Date"', () => {
    for (const bad of [null, undefined, '', 'not-a-date']) {
      const out = orderDate(bad as never);
      expect(out).toBe('');
      expect(out).not.toContain('Invalid');
    }
  });
});

describe('label maps', () => {
  // The contract that matters: never hand a customer a raw snake_case enum, and
  // never render "undefined". An unmapped value should degrade to something
  // human — these assert the function is total, not that any specific wording
  // is frozen.
  const labellers: [string, (s: string | null | undefined) => string][] = [
    ['statusLabel', statusLabel],
    ['fulfillmentLabel', fulfillmentLabel],
    ['deliveryStatusLabel', deliveryStatusLabel],
  ];

  for (const [name, fn] of labellers) {
    it(`${name} never returns undefined/null`, () => {
      for (const v of [null, undefined, '', 'totally_unknown_value']) {
        const out = fn(v as never);
        expect(out).toBeTypeOf('string');
        expect(out).not.toContain('undefined');
        expect(out).not.toContain('null');
      }
    });

    it(`${name} produces a non-empty label for a known status`, () => {
      // 'delivered' is common to all three domains in this app.
      const out = fn('delivered');
      expect(out.length).toBeGreaterThan(0);
    });
  }
});
