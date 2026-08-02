import { describe, it, expect, beforeEach, vi } from 'vitest';

// The commerce-event façade. What matters is not that it "sends something" but
// that GA4 gets the EXACT parameter names its standard reports read — get
// item_id or search_term wrong and the events arrive while the reports stay
// empty, which is indistinguishable from sending nothing at all.
//
// Also locks the two double-count hazards: purchase must not re-fire GA4 (it is
// already sent from the checkout's redirect-survival stash), and a zero result
// count must survive to the first-party call.

const gaCalls: Array<{ name: string; params: Record<string, unknown> }> = [];
const fpCalls: Array<Record<string, unknown>> = [];

vi.mock('./analytics', () => ({
  trackEvent: (name: string, params: Record<string, unknown>) => { gaCalls.push({ name, params }); },
}));
vi.mock('./siteEvents', () => ({
  track: (input: Record<string, unknown>) => { fpCalls.push(input); },
}));

const { productViewed, addedToCart, searched, itemListViewed, purchased } = await import('./events');

beforeEach(() => { gaCalls.length = 0; fpCalls.length = 0; });

const ITEM = {
  product_id: 'p-1', sku: '6485-Tr', name: 'Allie Truffle Chofa',
  price: 1299.99, qty: 2, category: 'Sofas',
};

describe('productViewed', () => {
  it('sends GA4 view_item with the reserved parameter names', () => {
    productViewed(ITEM);
    expect(gaCalls).toHaveLength(1);
    expect(gaCalls[0].name).toBe('view_item');
    const item = (gaCalls[0].params.items as Array<Record<string, unknown>>)[0];
    // These key names are GA4's contract, not ours.
    expect(item.item_id).toBe('6485-Tr');
    expect(item.item_name).toBe('Allie Truffle Chofa');
    expect(item.price).toBe(1299.99);
    expect(item.quantity).toBe(2);
    expect(gaCalls[0].params.currency).toBe('USD');
  });

  it('also records first-party, once', () => {
    productViewed(ITEM);
    expect(fpCalls).toHaveLength(1);
    expect(fpCalls[0]).toMatchObject({ event_type: 'product_view', sku: '6485-Tr', product_id: 'p-1' });
  });

  it('falls back to the uuid when a SKU is missing rather than dropping item_id', () => {
    productViewed({ product_id: 'p-2', sku: null, name: 'X', price: 10 });
    const item = (gaCalls[0].params.items as Array<Record<string, unknown>>)[0];
    expect(item.item_id).toBe('p-2');
  });
});

describe('addedToCart', () => {
  it('fires GA4 add_to_cart — the event Meta AddToCart is mapped from', () => {
    addedToCart(ITEM);
    expect(gaCalls[0].name).toBe('add_to_cart');
    // value must be price × quantity, not price: Meta and GA4 both bid on this.
    expect(gaCalls[0].params.value).toBeCloseTo(2599.98, 2);
  });

  it('records first-party with the price and qty', () => {
    addedToCart(ITEM);
    expect(fpCalls[0]).toMatchObject({ event_type: 'add_to_cart', sku: '6485-Tr' });
    expect(fpCalls[0].payload).toMatchObject({ price: 1299.99, qty: 2 });
  });
});

describe('searched', () => {
  it("uses GA4's reserved search_term parameter", () => {
    searched('murphy bed', 0);
    expect(gaCalls[0].name).toBe('search');
    expect(gaCalls[0].params.search_term).toBe('murphy bed');
  });

  it('KEEPS a zero result count — the row that matters most', () => {
    searched('murphy bed', 0);
    expect(fpCalls[0].results_count).toBe(0);
  });

  it('passes a missing count through as null, not as zero', () => {
    // Conflating "no results" with "not measured" would invent unmet demand.
    searched('sofa');
    expect(fpCalls[0].results_count).toBeNull();
  });

  it('ignores an empty search rather than recording a blank query', () => {
    searched('', 5);
    expect(gaCalls).toHaveLength(0);
    expect(fpCalls).toHaveLength(0);
  });
});

describe('purchased', () => {
  it('does NOT re-fire GA4 — revenue would be double counted', () => {
    purchased('INV-1', 500, 2);
    expect(gaCalls).toHaveLength(0);
    expect(fpCalls).toHaveLength(1);
    expect(fpCalls[0]).toMatchObject({ event_type: 'purchase' });
    expect(fpCalls[0].payload).toMatchObject({ invoice_number: 'INV-1', value: 500, item_count: 2 });
  });
});

describe('itemListViewed', () => {
  it('sends the list name GA4 groups by', () => {
    itemListViewed('Shop', [ITEM]);
    expect(gaCalls[0].name).toBe('view_item_list');
    expect(gaCalls[0].params.item_list_name).toBe('Shop');
  });

  it('sends nothing for an empty list', () => {
    itemListViewed('Shop', []);
    expect(gaCalls).toHaveLength(0);
  });

  it('caps the payload — GA4 silently drops oversized event bodies', () => {
    itemListViewed('Shop', Array.from({ length: 60 }, () => ITEM));
    expect((gaCalls[0].params.items as unknown[]).length).toBe(20);
  });
});
