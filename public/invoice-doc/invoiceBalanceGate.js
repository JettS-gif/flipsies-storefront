// utils/invoiceBalanceGate.js
// Frontend mirror of DeliverDeskBackEnd/utils/invoiceBalanceGate.js.
// MUST stay in lockstep with the backend — the backend is the
// authoritative gate; this exists so the UI shows the correct balance
// due / paid-in-full state without an API round-trip.
//
// Pre-fix the cent-precision "max(0, total - amount_paid)" was inlined in
// ~18 views (invoiceDetail, invoicePayment, invoiceSchedule, commissions,
// the kanbans, invoicePrint, etc.) — each a separate copy of the rule.
//
// Returns credit-memo (2026-07-24): a return refunds money by posting a
// NEGATIVE payment, which drops amount_paid, but the invoice total is
// never netted — so balance = total - amount_paid rose by the refund, a
// phantom "owed" on every paid-then-returned invoice. invoices.returns_credit
// (trigger-owned) carries the cash/card refund total; subtracting it here
// restores the correct balance without touching the historical total.
// Callers whose invoice object lacks returns_credit get 0 → today's
// behavior, no crash.

function toCents(n) {
  return Math.round(Number(n || 0) * 100);
}

/**
 * Dollars still owed on the invoice, clamped at 0 (no negative balances).
 *
 * @param {{ total?: number|string, amount_paid?: number|string, returns_credit?: number|string }} inv
 * @returns {number} dollars
 */
export function balanceDue(inv) {
  if (!inv) return 0;
  const totalCents  = toCents(inv.total);
  const paidCents   = toCents(inv.amount_paid);
  const creditCents = toCents(inv.returns_credit);
  return Math.max(0, (totalCents - paidCents - creditCents) / 100);
}

/**
 * True when the invoice is paid in full (net of any return credit).
 *
 * @param {{ total?: number|string, amount_paid?: number|string, returns_credit?: number|string }} inv
 * @param {number} [toleranceCents=0] negative balances (overpay) always pass
 * @returns {boolean}
 */
export function isFullyPaid(inv, toleranceCents = 0) {
  if (!inv) return false;
  const totalCents  = toCents(inv.total);
  const paidCents   = toCents(inv.amount_paid);
  const creditCents = toCents(inv.returns_credit);
  return (totalCents - paidCents - creditCents) <= toleranceCents;
}
