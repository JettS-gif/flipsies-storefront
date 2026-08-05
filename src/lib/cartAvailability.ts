/**
 * How a cart's lines split between "here now" and "made to order", and what to
 * quote as the wait.
 *
 * Lives here rather than inline in cart/page.tsx for the same reason
 * checkoutReadiness.ts does: it is a rule, it has edge cases, and a rule that
 * cannot be unit-tested stops being tested.
 *
 * WHY THIS EXISTS AT ALL. 527 of 2,876 published products (18%) are buyable with
 * nothing on hand and nothing on order, and until 2026-08-04 the only signal was
 * a PDP line reading "Ask about lead time" — a question we already knew the
 * answer to, since every one of those 527 has vendor lead weeks on file. A
 * shopper who discovers the wait at the delivery step goes back to the cart and
 * leaves. That session is on record (Barrett Ottoman, 2026-08-04: 71 seconds on
 * checkout, back to the cart, gone).
 */

export interface AvailabilityLine {
  /**
   * Undefined means UNKNOWN, not false. Lines added before this field shipped
   * carry nothing, and reading absent-as-out-of-stock would decorate an old
   * cart with made-to-order warnings for items sitting in the warehouse.
   */
  in_stock?: boolean;
  lead_label?: string | null;
}

export interface CartAvailability {
  inStockLines: number;
  madeToOrderLines: number;
  /** Both kinds present — the only case worth interrupting the customer for. */
  mixed: boolean;
  /** The slowest lead label in the cart, or null when none is known. */
  longestLead: string | null;
}

/**
 * Largest number in a lead label. "4–6 weeks" -> 6, "10 weeks" -> 10.
 *
 * Compared numerically rather than as a string on purpose: sorting the labels
 * lexically puts "10 weeks" BEFORE "4–6 weeks", so the cart would promise the
 * customer the shorter of the two waits and be wrong by a month.
 *
 * Takes the MAX within a label, not the min: "4–6 weeks" means it may take six,
 * and the honest number to quote for a whole order is the outer bound.
 */
export function leadWeeks(label?: string | null): number {
  const nums = String(label ?? '').match(/\d+/g);
  if (!nums) return 0;
  return Math.max(...nums.map(Number));
}

export function summarizeCartAvailability(items: AvailabilityLine[]): CartAvailability {
  const list = Array.isArray(items) ? items : [];
  const inStockLines = list.filter(i => i?.in_stock === true).length;
  const madeToOrder  = list.filter(i => i?.in_stock === false);

  // The order lands on its slowest line, so that is the one to quote.
  const longestLead = madeToOrder
    .map(i => i?.lead_label)
    .filter((l): l is string => !!l)
    .sort((a, b) => leadWeeks(b) - leadWeeks(a))[0] ?? null;

  return {
    inStockLines,
    madeToOrderLines: madeToOrder.length,
    // Requires BOTH kinds. An all-made-to-order cart is not a split decision —
    // there is nothing to take home early — and the per-line badges already say
    // so without a banner repeating it.
    mixed: inStockLines > 0 && madeToOrder.length > 0,
    longestLead,
  };
}
