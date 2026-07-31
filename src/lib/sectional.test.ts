import { describe, it, expect } from 'vitest';
import { configurationTotal, type SelectedPiece } from './sectional';

// configurationTotal is the price a customer sees for a sectional they built
// piece by piece. It is the most money-adjacent pure function in this repo:
// a sectional is a four-figure purchase assembled from parts, and this is the
// number that decides what the cart says.
//
// The backend re-derives the real charge (storefrontPriceAuthority contract
// test in DeliverDeskBackEnd), so a bug here cannot undercharge the card — but
// it CAN quote a customer a price the checkout then disagrees with, which is a
// trust problem discovered at the worst possible moment.

// Minimal shape — the function only reads matched.retail_price and qty.
const piece = (retail: number | string | null, qty: number, matched = true) =>
  ({
    matched: matched ? ({ retail_price: retail } as never) : null,
    qty,
  } as unknown as SelectedPiece);

describe('configurationTotal', () => {
  it('sums price × qty across pieces', () => {
    expect(configurationTotal([
      piece(899.97, 1),
      piece(1299.97, 2),
    ])).toBeCloseTo(899.97 + 1299.97 * 2, 2);
  });

  it('is zero for an empty configuration', () => {
    expect(configurationTotal([])).toBe(0);
  });

  // A piece the customer picked but that has no product behind it must not be
  // silently priced — it contributes nothing rather than NaN-ing the total.
  it('skips unmatched pieces instead of poisoning the total', () => {
    const total = configurationTotal([
      piece(500, 1),
      piece(null, 1, false),
    ]);
    expect(total).toBe(500);
    expect(Number.isNaN(total)).toBe(false);
  });

  it('skips zero and negative quantities', () => {
    expect(configurationTotal([piece(500, 0), piece(500, -2)])).toBe(0);
  });

  // retail_price arrives from JSON and is routinely a string.
  it('coerces string prices from the API', () => {
    expect(configurationTotal([piece('749.99', 2)])).toBeCloseTo(1499.98, 2);
  });

  // An absent price must read as 0, not NaN — a NaN total renders "$NaN" in the
  // cart, which is worse than a wrong number because it looks broken to the
  // customer mid-purchase. These are the shapes the API actually produces for a
  // priceless row.
  it('treats an absent price as zero, never NaN', () => {
    for (const absent of [null, undefined, ''] as const) {
      const total = configurationTotal([piece(absent as never, 1), piece(100, 1)]);
      expect(Number.isNaN(total)).toBe(false);
      expect(total).toBe(100);
    }
  });

  // KNOWN GAP, documented rather than asserted: `Number(retail_price || 0)`
  // guards falsy values, but a NON-NUMERIC STRING is truthy, so it survives the
  // `|| 0` and becomes NaN — poisoning the whole total, not just its own line.
  // retail_price is a numeric DB column so this shouldn't occur in practice,
  // which is why it isn't fixed here; a test asserting the broken behavior
  // would only cement it. Flagged for Jett — the hardening is one guard.
  it('DOCUMENTS: a non-numeric string price still NaNs the total', () => {
    const total = configurationTotal([piece('not-a-number' as never, 1), piece(100, 1)]);
    expect(Number.isNaN(total)).toBe(true); // <- current behavior, not desired
  });

  it('handles a realistic 5-piece sectional', () => {
    const total = configurationTotal([
      piece(1199.97, 1), // LSF loveseat
      piece(499.97, 2),  // armless chairs
      piece(899.97, 1),  // console
      piece(1099.97, 1), // RSF chaise
    ]);
    expect(total).toBeCloseTo(1199.97 + 499.97 * 2 + 899.97 + 1099.97, 2);
  });
});
