/**
 * "The shopper just came back from a payment redirect — did they pay?"
 *
 * Redirect methods (Affirm, Klarna, Cash App, some 3-D Secure) leave the page
 * and come back to the return_url, and Stripe appends `redirect_status`. Our
 * return_url carries `status=success` because it is built BEFORE the attempt,
 * and until 2026-11-14 the page believed it: a declined Klarna came back to
 * "Order Confirmed", the cart was cleared, and GA4 + Meta counted a purchase.
 * Stripe's own field is the answer; ours only says which page this is.
 *
 * In src/lib so it is inside the storefront's test scope (no jsdom).
 */

export type StripeReturnOutcome =
  /** Not a payment redirect at all — normal page load. */
  | 'none'
  /** Paid. Confirm, clear the cart, count the purchase. */
  | 'succeeded'
  /**
   * Accepted, settling (some pay-later / bank methods). The order stands and
   * the webhook records the money when it lands, so confirm — but do NOT count
   * a purchase that may still fail.
   */
  | 'processing'
  /** Declined, abandoned or unknown. Keep the cart and say so. */
  | 'failed';

export function stripeReturnOutcome(params: URLSearchParams): StripeReturnOutcome {
  if (params.get('status') !== 'success') return 'none';
  const rs = params.get('redirect_status');
  if (rs === 'succeeded') return 'succeeded';
  if (rs === 'processing') return 'processing';
  // Missing counts as failed: every Stripe redirect carries it, so a URL
  // without one was not produced by a completed payment.
  return 'failed';
}

export const PAYMENT_NOT_COMPLETED_MESSAGE =
  "Your payment didn't go through, so you have not been charged. Your cart is still here — " +
  'please try again or choose a different payment method. Questions? Call us at (205) 238-5076.';
