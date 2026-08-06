import { describe, it, expect } from 'vitest';
import type { Product } from '@/lib/api';
import { buildGoogleFeed, googleRow, GOOGLE_FEED_COLUMNS } from '@/lib/googleFeed';
import { feedRow, FEED_COLUMNS } from '@/lib/productFeed';

const base: Product = {
  id: 'abc-123',
  sku: '101-113-14',
  name: 'FLASH DANCE · Swivel · Chair',
  collection: 'Flash Dance',
  color: 'Charcoal',
  material: 'Polyester',
  material_class: null,
  type: 'Swivel Chair',
  category: 'Accent Chair',
  room: 'Living Room',
  retail_price: 699.97,
  compare_at_price: null,
  in_stock: true,
  vendor: { name: 'Southern Motion' },
  sectional_piece_type: null,
  sectional_family: null,
  images: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
  dimensions: '29"W x 35"D x 39"H',
  variant_group_id: null,
};

const cells = (p: Product) => {
  const v = googleRow(p).split('\t');
  return Object.fromEntries(GOOGLE_FEED_COLUMNS.map((c, i) => [c, v[i]]));
};

const chatgptCells = (p: Product) => {
  const v = feedRow(p).split('\t');
  return Object.fromEntries(FEED_COLUMNS.map((c, i) => [c, v[i]]));
};

describe('googleRow', () => {
  it('emits one cell per declared column', () => {
    expect(googleRow(base).split('\t')).toHaveLength(GOOGLE_FEED_COLUMNS.length);
  });

  it('uses Google field names and price format', () => {
    const c = cells(base);
    expect(c.id).toBe('abc-123');
    expect(c.link).toBe('https://www.flipsiesfurniture.com/product/abc-123');
    expect(c.image_link).toBe('https://cdn.example.com/a.jpg');
    expect(c.additional_image_link).toBe('https://cdn.example.com/b.jpg');
    expect(c.price).toBe('699.97 USD');
    expect(c.condition).toBe('new');
  });

  it('carries dimensions with the unit inline', () => {
    const c = cells(base);
    expect(c.product_width).toBe('29 in');
    expect(c.product_length).toBe('35 in'); // depth IS length
    expect(c.product_height).toBe('39 in');
  });

  it('omits dimensions rather than guessing when nothing parsed', () => {
    const c = cells({ ...base, dimensions: null });
    expect(c.product_length).toBe('');
    expect(c.product_width).toBe('');
  });

  it('builds product_type from our own taxonomy', () => {
    expect(cells(base).product_type).toBe('Living Room > Accent Chair > Swivel Chair');
  });

  it('emits a real UPC as gtin and always carries brand + mpn', () => {
    const c = cells({ ...base, upc: '888473805366' });
    expect(c.gtin).toBe('888473805366');
    expect(c.mpn).toBe('101-113-14');
    expect(c.brand).toBe('Southern Motion');
  });

  // A hyphenated SKU must never become a GTIN — same guard as the ChatGPT feed.
  it('leaves gtin empty when no UPC is recorded', () => {
    expect(cells(base).gtin).toBe('');
  });

  // identifier_exists=no belongs to products with NO manufacturer identifier at
  // all. Every row here has brand + mpn, so declaring `no` would be false and
  // would forfeit the model-level matching mpn exists to win.
  it('does not declare identifier_exists', () => {
    expect(GOOGLE_FEED_COLUMNS).not.toContain('identifier_exists');
  });

  // Shipping is account-level: a flat rate bound to a 50-mile radius region.
  // Restating it per row would override the account rule if it ever drifted.
  it('does not carry a per-row shipping attribute', () => {
    expect(GOOGLE_FEED_COLUMNS).not.toContain('shipping');
  });

  // A wrong category decides which queries we compete in — worse than none.
  it('does not guess google_product_category', () => {
    expect(GOOGLE_FEED_COLUMNS).not.toContain('google_product_category');
  });

  it('cannot break a row on hostile copy', () => {
    const nasty = { ...base, description: 'Long marketing copy\twith a tab\nand a newline, well past the internal-note length gate so it is not suppressed.' };
    const row = googleRow(nasty);
    expect(row.split('\t')).toHaveLength(GOOGLE_FEED_COLUMNS.length);
    expect(row).not.toContain('\n');
  });
});

// The two feeds are published commitments about the same products, and a
// shopper can see both. Where they describe the same fact they must agree.
describe('agreement with the ChatGPT feed', () => {
  const cases: Product[] = [
    base,
    { ...base, in_stock: false },
    { ...base, in_stock: false, clearance: true },
    { ...base, upc: '888473805366' },
  ];

  it('never disagrees about availability', () => {
    for (const p of cases) expect(cells(p).availability).toBe(chatgptCells(p).availability);
  });

  it('never disagrees about price', () => {
    for (const p of cases) expect(cells(p).price).toBe(chatgptCells(p).price);
  });

  it('never disagrees about gtin', () => {
    for (const p of cases) expect(cells(p).gtin).toBe(chatgptCells(p).gtin);
  });

  it('never disagrees about the landing page', () => {
    for (const p of cases) expect(cells(p).link).toBe(chatgptCells(p).url);
  });
});

describe('buildGoogleFeed', () => {
  it('leads with the header row', () => {
    expect(buildGoogleFeed([base]).split('\n')[0]).toBe(GOOGLE_FEED_COLUMNS.join('\t'));
  });

  // Same eligibility rule as the ChatGPT feed — one source of truth.
  it('drops imageless and unpriced products', () => {
    const feed = buildGoogleFeed([
      base,
      { ...base, id: 'no-img', images: [], image_url: null },
      { ...base, id: 'no-price', retail_price: 0 },
    ]);
    const lines = feed.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('abc-123');
  });
});
