import { describe, it, expect } from 'vitest';
import { stripeReturnOutcome } from './stripeReturn';

const at = (qs: string) => stripeReturnOutcome(new URLSearchParams(qs));

describe('stripeReturnOutcome', () => {
  it('a normal page load is not a payment return', () => {
    expect(at('')).toBe('none');
    expect(at('redirect_status=succeeded')).toBe('none');
  });

  it('Stripe says succeeded → succeeded', () => {
    expect(at('status=success&invoice=WEB-1&payment_intent=pi_1&redirect_status=succeeded')).toBe('succeeded');
  });

  it('Stripe says processing → processing (confirm, but no purchase event)', () => {
    expect(at('status=success&invoice=WEB-1&redirect_status=processing')).toBe('processing');
  });

  it('a declined redirect is NOT "Order Confirmed" just because our return_url says success', () => {
    expect(at('status=success&invoice=WEB-1&redirect_status=failed')).toBe('failed');
    expect(at('status=success&invoice=WEB-1&redirect_status=requires_payment_method')).toBe('failed');
  });

  it('no redirect_status at all is treated as not paid', () => {
    expect(at('status=success&invoice=WEB-1')).toBe('failed');
  });
});
