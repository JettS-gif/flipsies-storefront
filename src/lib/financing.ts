// Synchrony "12 Months Same as Cash" is a DEFERRED-INTEREST promotion: if the
// balance is not paid in full in 12 months, interest is charged back to the
// purchase date. Reg Z 12 CFR 1026.16(h) therefore requires any "no interest" /
// "same as cash" claim to say "if paid in full" and to carry the
// interest-from-purchase-date statement closely proximate to it. It is not a
// 0% APR offer, so "0%" / "0% financing" must not describe it (2026-10-07).
//
// The staff floor tag (DeliverDeskFrontEnd "Finance" template) prints the same
// wording and the same monthly rule; change both together.

export const FINANCE_MONTHS = 12;

export const FINANCE_HEADLINE = 'No interest if paid in full within 12 months';

export const FINANCE_DISCLOSURE =
  'Interest is charged from the purchase date if the balance is not paid in full within 12 months. '
  + 'Minimum monthly payments required. Subject to credit approval.';

/** Monthly amount that pays the price off within the promo period, rounded up to whole dollars. */
export function financeMonthly(price: number): number | null {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) return null;
  return Math.ceil(p / FINANCE_MONTHS);
}
