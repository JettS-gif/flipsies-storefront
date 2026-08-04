// utils/depositThresholds.js
// Frontend mirror of DeliverDeskBackEnd/utils/depositThresholds.js.
// MUST stay in lockstep with the backend constants — if the layaway
// or custom-order percentage changes, both files move together. The
// backend is the authoritative gate; this file exists so the form
// + payment modal can show the correct minimum dollar amount as the
// user types, before the API round-trip.
//
// Pre-fix the percentages were hardcoded inline in:
//   views/invoicePayment.js:458,461,471,474   payment modal labels
//   utils/invoicePrint.js:584                 custom-order agreement print
//   views/invoiceDetail.js                    deposit-needed badge
// Each was a separate copy of the rule; a future policy change
// (e.g. seasonal promo dropping layaway to 15%) would have required
// chasing every copy and could silently miss one.

export const LAYAWAY_DEPOSIT_PCT      = 0.20;
export const CUSTOM_ORDER_DEPOSIT_PCT = 0.50;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Required deposit dollars for the invoice's type. Returns 0 for
 * regular invoices (any non-zero payment commits the sale).
 *
 * @param {{ type?: string, total?: number|string }} invoice
 * @returns {number} dollars
 */
export function requiredDeposit(invoice) {
  const total = num(invoice?.total);
  if (total <= 0) return 0;
  const pct = invoice?.type === 'layaway'      ? LAYAWAY_DEPOSIT_PCT
            : invoice?.type === 'custom_order' ? CUSTOM_ORDER_DEPOSIT_PCT
            : 0;
  if (!pct) return 0;
  // Round to cents (quoted deposit + gate threshold) — float total*pct made
  // a payment of the exact quoted deposit fail the gate. Mirrors backend.
  return Math.round(total * pct * 100) / 100;
}

/**
 * True when amount paid satisfies the deposit gate for the invoice's
 * type. Mirrors backend utils/depositThresholds.js.
 *
 * @param {{ type?: string, total?: number|string }} invoice
 * @param {number|string} amountPaid
 * @returns {boolean}
 */
export function meetsDepositThreshold(invoice, amountPaid) {
  const paid  = num(amountPaid);
  const total = num(invoice?.total);
  if (paid <= 0 || total <= 0) return false;
  const required = requiredDeposit(invoice);
  if (required <= 0) return paid > 0;
  // Cent comparison — a payment of the exact quoted deposit must pass.
  return Math.round(paid * 100) >= Math.round(required * 100);
}
