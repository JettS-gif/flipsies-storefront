import { describe, it, expect } from 'vitest';
import { publicDescription } from './publicDescription';

// Every string below is a real value from the live catalog on 2026-08-05, not
// an invented example. The guard exists because these reached Google.
const INTERNAL_NOTES = [
  'PELHAM - 12/11/24: Section 1, Row 2 (4)',
  'PELHAM - 12/18/24: Sec 1, Row 3 (9)',
  'PELHAM - 1/21/25: Sec 2, Row 4 (2)',
  'PELHAM - 1/21/25: Out of box by far bay door (1)',
  'PELHAM - 1/21/25: Crown Mark section on right side (3)',
  'PELHAM -',
  'Pelham - 12/11/24: Section 1, Row 1 (5)',
  'Row 20 Pelham WH3 boxes buried between row',
  '1 End of aisle with flipsies recliners in pelham',
  'Row 4 Pelham Counted 1/7',
  'Row 4 WH-Pelham',
  'Counted 1/7',
  'Counted 1/7 Row 4',
  'Irondale',
  // A second count campaign with an entirely different vocabulary — the
  // review's proposed pattern missed all of these.
  'Backstock located on shelf 4D - PC',
  'Backstock Located on Shelf 5A - PC',
  'Located on Shelf 3D in PC',
];

describe('publicDescription — suppresses internal notes', () => {
  it.each(INTERNAL_NOTES)('suppresses %s', (note) => {
    expect(publicDescription(note)).toBeNull();
  });

  it('returns null, not an empty string, so callers can fall through with ??', () => {
    expect(publicDescription('Counted 1/7')).toBeNull();
    expect(publicDescription('Counted 1/7') ?? 'generated').toBe('generated');
  });

  it('treats blank and missing input as absent', () => {
    expect(publicDescription('')).toBeNull();
    expect(publicDescription('   ')).toBeNull();
    expect(publicDescription(null)).toBeNull();
    expect(publicDescription(undefined)).toBeNull();
  });
});

// storefront_packages.description had the same scratch-field habit, but these
// leak our own cost and the vendor's price break rather than a bin location.
// They rendered in the package page body and its Product JSON-LD.
describe('publicDescription — suppresses internal pricing notes', () => {
  it.each([
    'Crown Mark 5P/CH set. Set cost 489.95 vs a-la-carte 559.95 (CM break $70).',
    'Crown Mark  set. Set cost 189.95 vs a-la-carte 209.95 (CM break $20).',
    'Complete unit — all components. Crown Mark multi-SKU item.',
  ])('suppresses %s', (note) => {
    expect(publicDescription(note)).toBeNull();
  });

  it('suppresses a pricing note that runs past the length gate', () => {
    // This one is 128 characters, which is why the pricing rule is NOT
    // length-gated the way the warehouse-location rule is.
    const note =
      'Crown Mark 5P JUL set. Set cost 299.95 vs a-la-carte 349.95 (CM break $50). ' +
      'JUL PRICE — expires end of month, reprice before Aug.';
    expect(note.length).toBeGreaterThan(120);
    expect(publicDescription(note)).toBeNull();
  });

  it('keeps the genuinely customer-facing package copy', () => {
    expect(publicDescription('Queen bedroom set')).toBe('Queen bedroom set');
    expect(publicDescription('Table, 4 chairs and a bench')).toBe('Table, 4 chairs and a bench');
  });
});

describe('publicDescription — keeps real copy', () => {
  // The length gate is what makes the guard safe. Hoover and Irondale are real
  // showroom names that belong in genuine copy; keywords alone would eat this.
  it('keeps long copy that legitimately names a showroom', () => {
    const copy =
      'Sink into the plush cushions of this power reclining sofa, upholstered in a durable ' +
      'performance weave. Come sit on it at our Hoover showroom before you buy — we keep one ' +
      'on the floor in every colorway we stock, and Irondale carries the loveseat.';
    expect(copy.length).toBeGreaterThanOrEqual(120);
    expect(publicDescription(copy)).toBe(copy);
  });

  it('keeps a short description a date pattern alone would have killed', () => {
    // "CHAIR 1/2" is a chair-and-a-half, not a count sheet.
    expect(publicDescription('CHAIR 1/2')).toBe('CHAIR 1/2');
  });

  it('keeps ordinary short piece descriptions', () => {
    for (const d of ['SWIVEL ROCKER', 'POWER HEADREST LOVESEAT', 'Adele Accent Cabinet', 'LAF CHAIR']) {
      expect(publicDescription(d)).toBe(d);
    }
  });

  it('does not fire on a shelf mentioned as a product feature', () => {
    expect(publicDescription('Open bookcase with an adjustable shelf and a wire-management cutout.')).not.toBeNull();
  });

  it('does not fire on a collection name that merely starts with the same letters', () => {
    expect(publicDescription('Wharton Collection dining table')).not.toBeNull();
    expect(publicDescription('Rowan upholstered bed')).not.toBeNull();
  });

  it('trims surrounding whitespace on the value it returns', () => {
    expect(publicDescription('  Solid oak dining table.  ')).toBe('Solid oak dining table.');
  });
});
