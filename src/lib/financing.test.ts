import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { financeMonthly, FINANCE_HEADLINE, FINANCE_DISCLOSURE } from './financing';

describe('financing copy — deferred-interest wording (Reg Z 1026.16(h))', () => {
  it('the headline carries "if paid in full"', () => {
    expect(FINANCE_HEADLINE).toMatch(/if paid in full/i);
  });

  it('the disclosure says interest runs from the purchase date', () => {
    expect(FINANCE_DISCLOSURE).toMatch(/charged from the purchase date/i);
  });

  it('no page describes the Synchrony promo as 0% / interest free', () => {
    for (const f of ['app/financing/page.tsx', 'app/product/[id]/page.tsx', 'lib/financing.ts']) {
      const src = readFileSync(join(__dirname, '..', f), 'utf8')
        .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      expect(src, f).not.toMatch(/0% (interest|financing|APR)|interest[- ]free/i);
    }
  });
});

describe('financeMonthly', () => {
  it('rounds up to whole dollars over 12 months', () => {
    expect(financeMonthly(1499.99)).toBe(125);
    expect(financeMonthly(1200)).toBe(100);
  });
  it('no figure for a missing or zero price', () => {
    expect(financeMonthly(0)).toBeNull();
    expect(financeMonthly(NaN)).toBeNull();
  });
});
