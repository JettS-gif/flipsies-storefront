import { describe, it, expect } from 'vitest';
import { productTitle, productMetaDescription, categoryNoun } from './productTitle';

// Fixtures are real catalog rows from 2026-08-05, reduced to the fields the
// title composer reads.
const flashDance = {
  name: '101 FLASH DANCE · Swivel · Chair',
  collection: '101 FLASH DANCE',
  color: null,
  type: 'Swivel Glider',
  category: 'Chair',
  vendor: { name: 'Southern Motion' },
  dimensions: '29"W x 35"D x 39"H',
  in_stock: true,
};

const fusion = {
  name: 'Fusion 1140 Series · Loveseat',
  collection: 'Fusion 1140 Series',
  color: 'Blair Cream',
  type: 'Loveseat',
  category: 'Loveseat',
  vendor: { name: 'Fusion' },
  in_stock: true,
};

describe('productTitle — composition', () => {
  it('puts brand, collection, colour and the category noun in the title', () => {
    expect(productTitle(flashDance)).toBe('Southern Motion 101 Flash Dance Swivel Glider');
  });

  it('dedups at word level so a vendor name inside the collection is not repeated', () => {
    // Part-level dedup would emit "Fusion Fusion 1140 Series Blair Cream Loveseat".
    expect(productTitle(fusion)).toBe('Fusion 1140 Series Blair Cream Loveseat');
  });

  it('disambiguates the pieces of one collection, which is the whole point', () => {
    const base = { collection: 'Akerson', color: 'Chalk', vendor: { name: 'Crown Mark' }, name: 'Akerson' };
    const dresser = productTitle({ ...base, category: 'Dresser' });
    const nightstand = productTitle({ ...base, category: 'Nightstand' });
    const bed = productTitle({ ...base, category: 'Bed' });
    expect(new Set([dresser, nightstand, bed]).size).toBe(3);
    expect(dresser).toBe('Crown Mark Akerson Chalk Dresser');
  });
});

describe('productTitle — cleaning', () => {
  it('strips the internal DISCONTINUED marker off the collection', () => {
    const t = productTitle({
      collection: 'Bancroft - DISCONTINUED',
      color: 'Berlin Mink',
      type: 'Recliner',
      vendor: { name: 'Revive (Southern Motion)' },
      name: 'Bancroft',
    });
    expect(t).not.toMatch(/discontinued/i);
    expect(t).toBe('Revive Bancroft Berlin Mink Recliner');
  });

  it('drops the bookkeeping parenthetical from the vendor name', () => {
    expect(productTitle({ collection: 'X', vendor: { name: 'Revive (Southern Motion)' }, name: 'X' })).toBe('Revive X');
  });

  it('softens vendor SHOUTING without touching model numbers or line codes', () => {
    expect(productTitle({ collection: '1157 BANK SHOT', vendor: { name: '' }, name: 'x' })).toBe('1157 Bank Shot');
    // A word with a digit is a model number.
    expect(productTitle({ collection: '6240P HERCULES', vendor: { name: '' }, name: 'x' })).toBe('6240P Hercules');
    // Runs shorter than 4 are abbreviations, not shouting.
    expect(productTitle({ collection: 'B&HB Sorbet Pot', vendor: { name: '' }, name: 'x' })).toBe('B&HB Sorbet Pot');
    expect(productTitle({ collection: 'LAF Chair', vendor: { name: '' }, name: 'x' })).toBe('LAF Chair');
    // Softens inside parentheses too.
    expect(productTitle({ collection: 'Regency', category: 'Desk (ONLY)', vendor: { name: '' }, name: 'x' }))
      .toBe('Regency Desk (Only)');
  });
});

describe('productTitle — fallbacks and budget', () => {
  it('falls back to product.name when every composed field is blank', () => {
    expect(productTitle({ name: 'Aleeda marble top server' })).toBe('Aleeda marble top server');
  });

  it('never returns an empty string for a product that has a name', () => {
    expect(productTitle({ name: 'X', collection: '', color: '', type: '', category: '' })).toBe('X');
  });

  it('takes the noun from the trailing name segment when type and category are blank', () => {
    expect(categoryNoun({ name: '101 FLASH DANCE · Swivel · Chair' })).toBe('Chair');
    expect(categoryNoun({ name: 'Aspen Kitchen Island' })).toBe('');
  });

  it('drops the brand rather than truncating when the title runs long', () => {
    const long = {
      collection: 'Bancroft Heritage Collection',
      color: 'Berlin Mink Performance Weave',
      type: "Power Headrest Big Man's Wallhugger Recliner",
      vendor: { name: 'Swan Creek Candle Company' },
      name: 'x',
    };
    const t = productTitle(long);
    expect(t).not.toMatch(/^Swan Creek/);
    expect(t).toMatch(/^Bancroft Heritage/);
    expect(t).not.toMatch(/…|\.\.\./);
  });
});

describe('productMetaDescription', () => {
  it('never contains a price — it goes stale in Google cache', () => {
    expect(productMetaDescription(flashDance, null)).not.toMatch(/\$\d/);
  });

  it('lands inside the 70-160 character window', () => {
    for (const p of [flashDance, fusion, { name: 'X', collection: 'X', in_stock: false }]) {
      const m = productMetaDescription(p, null);
      expect(m.length, m).toBeGreaterThanOrEqual(70);
      expect(m.length, m).toBeLessThanOrEqual(160);
    }
  });

  it('includes dimensions when the record has them', () => {
    expect(productMetaDescription(flashDance, null)).toContain('29"W x 35"D x 39"H');
  });

  it('prefers real copy once it is long enough to stand alone', () => {
    const copy =
      'Sink into the plush cushions of this power reclining sofa, upholstered in a durable ' +
      'performance weave that stands up to a family.';
    expect(productMetaDescription(flashDance, copy)).toBe(copy);
  });

  it('ignores short copy that merely echoes the title', () => {
    // "POWER HEADREST LOVESEAT" as a description would shout a duplicate back.
    const m = productMetaDescription({ ...fusion, type: 'Loveseat' }, 'LOVESEAT');
    expect(m).not.toMatch(/LOVESEAT/);
    expect(m).toMatch(/^Fusion 1140 Series Blair Cream Loveseat\./);
  });

  it('leads with short copy that adds something, softened', () => {
    const m = productMetaDescription(fusion, 'POWER HEADREST');
    expect(m).toMatch(/^Power Headrest\./);
  });

  it('truncates over-long real copy on a word boundary with an ellipsis', () => {
    const m = productMetaDescription(flashDance, 'x'.repeat(400));
    expect(m.length).toBeLessThanOrEqual(160);
    expect(m.endsWith('…')).toBe(true);
  });

  it('says made-to-order rather than in stock when the piece is not stocked', () => {
    expect(productMetaDescription({ ...fusion, in_stock: false }, null)).toMatch(/Order yours/);
  });
});
