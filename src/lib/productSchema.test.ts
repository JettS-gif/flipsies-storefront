import { describe, it, expect } from 'vitest';
import { parseDimensions, dimensionSchema, availabilityUrl, priceValidUntil } from './productSchema';
import { todayCT } from './ct';

describe('parseDimensions', () => {
  it('parses the dominant catalog format (960 of 1,003 rows)', () => {
    expect(parseDimensions('29"W x 35"D x 39"H')).toEqual({ width: 29, depth: 35, height: 39 });
  });

  it('handles decimals', () => {
    expect(parseDimensions('31.1"W x 16.38"D x 50.43"H')).toEqual({ width: 31.1, depth: 16.38, height: 50.43 });
  });

  it('handles partial dimension strings without inventing the missing axes', () => {
    expect(parseDimensions('58"W x 41"H')).toEqual({ width: 58, height: 41 });
    expect(parseDimensions('84"H')).toEqual({ height: 84 });
    expect(parseDimensions('22"D x 30"H')).toEqual({ depth: 22, height: 30 });
  });

  it('handles the prefixed form', () => {
    expect(parseDimensions('H: 84"')).toEqual({ height: 84 });
  });

  it('takes the upper bound of a range — that is the space a shopper needs', () => {
    expect(parseDimensions('62-66"W x 38"D').width).toBe(66);
  });

  it('accepts curly quotes and the word "in"', () => {
    expect(parseDimensions('29”W x 35”D')).toEqual({ width: 29, depth: 35 });
    expect(parseDimensions('29 in W')).toEqual({ width: 29 });
  });

  it('returns nothing for blank, missing or unparseable input', () => {
    expect(parseDimensions(null)).toEqual({});
    expect(parseDimensions(undefined)).toEqual({});
    expect(parseDimensions('')).toEqual({});
    expect(parseDimensions('see spec sheet')).toEqual({});
  });

  it('ignores a zero or negative measurement rather than emitting it', () => {
    expect(parseDimensions('0"W x 35"D')).toEqual({ depth: 35 });
  });
});

describe('dimensionSchema', () => {
  it('emits QuantitativeValue in inches', () => {
    expect(dimensionSchema('29"W x 35"D x 39"H')).toEqual({
      width: { '@type': 'QuantitativeValue', value: 29, unitCode: 'INH' },
      depth: { '@type': 'QuantitativeValue', value: 35, unitCode: 'INH' },
      height: { '@type': 'QuantitativeValue', value: 39, unitCode: 'INH' },
    });
  });

  it('omits axes it cannot determine, so it spreads cleanly into the JSON-LD', () => {
    expect(dimensionSchema('84"H')).toEqual({
      height: { '@type': 'QuantitativeValue', value: 84, unitCode: 'INH' },
    });
    expect(dimensionSchema(null)).toEqual({});
  });
});

describe('availabilityUrl', () => {
  it('maps out-of-stock to BackOrder, not PreOrder', () => {
    // These are made to order against a vendor's production queue, not
    // unreleased products awaiting a launch date.
    expect(availabilityUrl(false)).toBe('https://schema.org/BackOrder');
    expect(availabilityUrl(true)).toBe('https://schema.org/InStock');
  });
});

describe('priceValidUntil', () => {
  it('returns a Central-dated ISO day one year out', () => {
    expect(priceValidUntil('2026-08-05')).toBe('2027-08-05');
  });

  it('handles a leap day without drifting', () => {
    expect(priceValidUntil('2027-03-01')).toBe('2028-02-29');
  });

  it('is always in the future — a lapsed date can suppress the rich result', () => {
    expect(priceValidUntil() > todayCT()).toBe(true);
  });
});
