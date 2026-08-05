import { describe, it, expect } from 'vitest';
import { leadWeeks, summarizeCartAvailability } from './cartAvailability';

describe('leadWeeks', () => {
  it('reads the outer bound of a range', () => {
    expect(leadWeeks('4–6 weeks')).toBe(6);   // en dash, which is what the PDP renders
    expect(leadWeeks('4-6 weeks')).toBe(6);   // hyphen, in case copy changes
    expect(leadWeeks('6 weeks')).toBe(6);
  });

  it('is numeric, not lexical — the bug this exists to prevent', () => {
    // Sorted as strings, "10 weeks" < "4–6 weeks", so the cart would quote the
    // SHORTER wait on an order that actually takes ten weeks.
    expect(leadWeeks('10 weeks')).toBeGreaterThan(leadWeeks('4–6 weeks'));
  });

  it('treats missing or unparseable labels as zero rather than throwing', () => {
    expect(leadWeeks(null)).toBe(0);
    expect(leadWeeks(undefined)).toBe(0);
    expect(leadWeeks('')).toBe(0);
    expect(leadWeeks('ask us')).toBe(0);
  });
});

describe('summarizeCartAvailability', () => {
  const now  = { in_stock: true };
  const mto  = (lead: string | null) => ({ in_stock: false, lead_label: lead });
  const unknown = { sku: 'legacy' } as { in_stock?: boolean };

  it('flags a genuinely mixed cart and quotes the SLOWEST line', () => {
    const s = summarizeCartAvailability([now, mto('4–6 weeks'), mto('10 weeks')]);
    expect(s.mixed).toBe(true);
    expect(s.inStockLines).toBe(1);
    expect(s.madeToOrderLines).toBe(2);
    expect(s.longestLead).toBe('10 weeks');
  });

  it('is not mixed when everything is in stock', () => {
    const s = summarizeCartAvailability([now, now]);
    expect(s.mixed).toBe(false);
    expect(s.longestLead).toBeNull();
  });

  it('is not mixed when everything is made to order', () => {
    // Nothing to take home early, so there is no split to offer — the per-line
    // badges already carry the message.
    const s = summarizeCartAvailability([mto('4–6 weeks'), mto('8 weeks')]);
    expect(s.mixed).toBe(false);
    expect(s.longestLead).toBe('8 weeks');
  });

  it('treats an unknown line as neither — a pre-existing cart must not sprout warnings', () => {
    const s = summarizeCartAvailability([unknown, unknown]);
    expect(s.mixed).toBe(false);
    expect(s.inStockLines).toBe(0);
    expect(s.madeToOrderLines).toBe(0);
  });

  it('an unknown line alongside a real one does not manufacture a mix', () => {
    expect(summarizeCartAvailability([unknown, mto('6 weeks')]).mixed).toBe(false);
    expect(summarizeCartAvailability([unknown, now]).mixed).toBe(false);
  });

  it('mixed with no lead data anywhere still flags, with a null quote', () => {
    // The banner has copy for this: "the rest is made to order", no number.
    const s = summarizeCartAvailability([now, mto(null)]);
    expect(s.mixed).toBe(true);
    expect(s.longestLead).toBeNull();
  });

  it('survives junk input rather than throwing on a render path', () => {
    expect(summarizeCartAvailability([]).mixed).toBe(false);
    // @ts-expect-error deliberate: the cart is rehydrated from localStorage
    expect(summarizeCartAvailability(null).mixed).toBe(false);
  });
});
