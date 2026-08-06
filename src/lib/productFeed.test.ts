import { describe, it, expect } from 'vitest';
import type { Product } from '@/lib/api';
import { buildFeed, feedRow, feedAvailability, feedDescription, isFeedEligible, validGtin, FEED_COLUMNS } from '@/lib/productFeed';

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

const cellsOf = (p: Product) => {
  const values = feedRow(p).split('\t');
  return Object.fromEntries(FEED_COLUMNS.map((c, i) => [c, values[i]]));
};

describe('feedAvailability', () => {
  it('maps in-stock to in_stock', () => {
    expect(feedAvailability({ in_stock: true, clearance: false })).toBe('in_stock');
  });

  // Out-of-stock is made to order against the vendor's queue, not awaiting a launch.
  it('maps out-of-stock to backorder', () => {
    expect(feedAvailability({ in_stock: false, clearance: false })).toBe('backorder');
  });

  // A vendor-exited line cannot be reordered, so backorder would promise a
  // restock that will never come.
  it('maps out-of-stock clearance to out_of_stock, not backorder', () => {
    expect(feedAvailability({ in_stock: false, clearance: true })).toBe('out_of_stock');
  });
});

describe('validGtin', () => {
  it('accepts the four real GTIN lengths', () => {
    for (const n of [8, 12, 13, 14]) {
      const digits = '1'.repeat(n);
      expect(validGtin(digits)).toBe(digits);
    }
  });

  // A wrong-length value does not fail closed — it asserts a specific product
  // identity and gets matched against somebody else's listing.
  it('rejects wrong-length digit strings', () => {
    for (const n of [7, 9, 10, 11, 15]) expect(validGtin('1'.repeat(n))).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(validGtin('  888473805366 ')).toBe('888473805366');
  });

  // The regression this function exists for. Stripping separators would collapse
  // Southern Motion's "101-113-14" to "10111314" — eight digits, a structurally
  // valid GTIN-8, and somebody else's product.
  it('never manufactures a GTIN out of a hyphenated SKU', () => {
    expect(validGtin('101-113-14')).toBe('');
    expect(validGtin('888-4738-05366')).toBe('');
    expect(validGtin('CAE-1195')).toBe('');
  });

  it('treats null/undefined/empty as no GTIN', () => {
    expect(validGtin(null)).toBe('');
    expect(validGtin(undefined)).toBe('');
    expect(validGtin('')).toBe('');
  });
});

describe('isFeedEligible', () => {
  it('accepts a priced product with an image', () => {
    expect(isFeedEligible(base)).toBe(true);
  });

  it('rejects an imageless product', () => {
    expect(isFeedEligible({ ...base, images: [], image_url: null })).toBe(false);
  });

  it('rejects a zero-priced product', () => {
    expect(isFeedEligible({ ...base, retail_price: 0 })).toBe(false);
  });

  it('accepts a product carrying only a derived image_url', () => {
    expect(isFeedEligible({ ...base, images: null, image_url: '/x.jpg' })).toBe(true);
  });
});

describe('feedRow', () => {
  it('emits one cell per declared column', () => {
    expect(feedRow(base).split('\t')).toHaveLength(FEED_COLUMNS.length);
  });

  it('carries price with an ISO 4217 code', () => {
    expect(cellsOf(base).price).toBe('699.97 USD');
  });

  it('splits the gallery into image_url plus additional_image_urls', () => {
    const c = cellsOf(base);
    expect(c.image_url).toBe('https://cdn.example.com/a.jpg');
    expect(c.additional_image_urls).toBe('https://cdn.example.com/b.jpg');
  });

  it('makes a relative image absolute', () => {
    expect(cellsOf({ ...base, images: ['/uploads/x.jpg'] }).image_url).toMatch(/^https:\/\/.+\/uploads\/x\.jpg$/);
  });

  // schema.org dimensions parse to width/depth/height; the feed wants L x W x H,
  // where length IS our depth.
  it('maps parsed dimensions onto length/width/height with a unit', () => {
    const c = cellsOf(base);
    expect(c.width).toBe('29');
    expect(c.length).toBe('35');
    expect(c.height).toBe('39');
    expect(c.dimensions_unit).toBe('in');
  });

  it('leaves dimensions_unit blank when nothing parsed', () => {
    const c = cellsOf({ ...base, dimensions: null });
    expect(c.length).toBe('');
    expect(c.dimensions_unit).toBe('');
  });

  it('builds product_category as a > hierarchy', () => {
    expect(cellsOf(base).product_category).toBe('Living Room > Accent Chair');
  });

  // A fabricated GTIN is worse than an absent one; mpn carries the vendor part
  // number that does the model-level matching.
  it('leaves gtin empty when no UPC is recorded, and puts the vendor SKU in mpn', () => {
    const c = cellsOf(base);
    expect(c.gtin).toBe('');
    expect(c.mpn).toBe('101-113-14');
  });

  it('emits a recorded UPC as gtin', () => {
    expect(cellsOf({ ...base, upc: '888473805366' }).gtin).toBe('888473805366');
  });

  it('ships discovery-only', () => {
    const c = cellsOf(base);
    expect(c.is_eligible_search).toBe('true');
    expect(c.is_eligible_checkout).toBe('false');
  });

  // Mirrors merchantReturnPolicySchema's MerchantReturnNotPermitted carve-out.
  it('withholds returns on clearance', () => {
    const c = cellsOf({ ...base, clearance: true });
    expect(c.accepts_returns).toBe('false');
    expect(c.return_deadline_in_days).toBe('');
  });

  it('grants returns with a deadline otherwise', () => {
    const c = cellsOf(base);
    expect(c.accepts_returns).toBe('true');
    expect(Number(c.return_deadline_in_days)).toBeGreaterThan(0);
  });

  it('flags a variant group as having variations', () => {
    expect(cellsOf({ ...base, variant_count: 4 }).listing_has_variations).toBe('true');
    expect(cellsOf(base).listing_has_variations).toBe('false');
  });

  // A collapsed listing that claims variations but never names them cannot
  // answer "does it come in grey?" — which is the whole point of collapsing.
  it('names the colourways a collapsed listing stands for', () => {
    const v = (color: string, id: string) => ({ id, color, size: null, in_stock: true, image_url: null, retail_price: 699.97 });
    const c = cellsOf({ ...base, variant_count: 3, variants: [v('Charcoal', '1'), v('Wynn Blue', '2'), v('Hayride Greystone', '3')] });
    expect(JSON.parse(c.variant_dict)).toEqual({ color: ['Charcoal', 'Wynn Blue', 'Hayride Greystone'] });
  });

  it('keys variant_dict on size for a size-axis group', () => {
    const v = (size: string, id: string) => ({ id, color: null, size, in_stock: true, image_url: null, retail_price: 699.97 });
    const c = cellsOf({ ...base, variant_axis: 'size' as const, variant_count: 2, variants: [v('Queen', '1'), v('King', '2')] });
    expect(JSON.parse(c.variant_dict)).toEqual({ size: ['Queen', 'King'] });
  });

  it('leaves variant_dict empty when there is nothing to choose between', () => {
    expect(cellsOf(base).variant_dict).toBe('');
    const one = [{ id: '1', color: 'Charcoal', size: null, in_stock: true, image_url: null, retail_price: 699.97 }];
    expect(cellsOf({ ...base, variants: one }).variant_dict).toBe('');
  });

  // variant_dict is JSON inside a TSV cell — its braces and quotes must not
  // disturb the row, and a huge fabric library must not dwarf every other cell.
  it('keeps variant_dict from breaking the row or running away', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: String(i), color: `Colour ${i}`, size: null, in_stock: true, image_url: null, retail_price: 1 }));
    const p = { ...base, variant_count: 40, variants: many };
    expect(feedRow(p).split('\t')).toHaveLength(FEED_COLUMNS.length);
    expect(JSON.parse(cellsOf(p).variant_dict).color).toHaveLength(25);
  });

  it('emits size for flat goods', () => {
    expect(cellsOf({ ...base, size: "8' x 10'" }).size).toBe("8' x 10'");
  });

  // The delimiter must be unreachable from the data, or one bad description
  // silently shifts every later column on that row.
  it('strips embedded tabs and newlines so the row cannot break', () => {
    const nasty = { ...base, description: 'A really genuinely long piece of marketing copy\twith a tab\nand a newline in it, easily past the internal-note length gate.' };
    const row = feedRow(nasty);
    expect(row.split('\t')).toHaveLength(FEED_COLUMNS.length);
    expect(row).not.toContain('\n');
  });
});

describe('feedDescription', () => {
  // The feed is a national surface; the delivery footprint is the single most
  // important fact about buying furniture from us.
  it('always states the local delivery footprint', () => {
    expect(feedDescription(base)).toContain('Birmingham');
  });

  it('says made to order when out of stock', () => {
    expect(feedDescription({ ...base, in_stock: false })).toContain('Made to order');
  });

  it('says final units on out-of-stock clearance', () => {
    expect(feedDescription({ ...base, in_stock: false, clearance: true })).toContain('Final units');
  });

  // publicDescription() suppresses warehouse scratch notes; the feed must not
  // reintroduce what the PDP refuses to publish.
  it('never leaks an internal warehouse note', () => {
    const d = feedDescription({ ...base, description: 'PELHAM - 12/11/24: Section 1, Row 2 (4)' });
    expect(d).not.toContain('PELHAM');
    expect(d).not.toContain('Row 2');
  });
});

describe('buildFeed', () => {
  it('leads with the header row', () => {
    expect(buildFeed([base]).split('\n')[0]).toBe(FEED_COLUMNS.join('\t'));
  });

  it('emits one line per eligible product and drops the rest', () => {
    const feed = buildFeed([base, { ...base, id: 'no-img', images: [], image_url: null }]);
    const lines = feed.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('abc-123');
  });

  it('produces a header-only feed when nothing is eligible', () => {
    expect(buildFeed([{ ...base, retail_price: 0 }]).trim().split('\n')).toHaveLength(1);
  });
});
