import { describe, it, expect } from 'vitest';
import { activeFilterCount, buildHref, PRICE_BUCKETS, FILTER_KEYS, SORTS, pageOf, pageCount, PAGE_SIZE } from './shopFilters';

// /shop keeps every filter in the URL so a filtered view is shareable,
// back-button-able and server-rendered. That makes buildHref the single point
// where a filter can get stuck: if removal doesn't actually drop the key, a
// shopper clicks "Under $250" off and the page still shows only cheap items —
// with no visible reason, because the chip is gone but the param isn't.

describe('activeFilterCount', () => {
  it('is zero for an unfiltered view', () => {
    expect(activeFilterCount({})).toBe(0);
  });

  it('counts each independent filter once', () => {
    expect(activeFilterCount({ room: 'Living Room' })).toBe(1);
    expect(activeFilterCount({ room: 'Living Room', brand: 'Southern Motion' })).toBe(2);
  });

  // A price range is ONE choice to a shopper even though it's two params —
  // counting it twice would make "Clear all (3)" appear after two clicks.
  it('counts a price range as a single filter', () => {
    expect(activeFilterCount({ price_min: '250', price_max: '500' })).toBe(1);
    expect(activeFilterCount({ price_max: '250' })).toBe(0); // open-ended low bucket
    expect(activeFilterCount({ price_min: '2000' })).toBe(1); // open-ended high bucket
  });

  // `search` is deliberately not a filter — it's the query itself.
  it('does not count the search term as a filter', () => {
    expect(activeFilterCount({ search: 'recliner' })).toBe(0);
    expect(FILTER_KEYS).not.toContain('search');
  });

  it('ignores empty-string params', () => {
    expect(activeFilterCount({ room: '', brand: '' })).toBe(0);
  });
});

describe('buildHref', () => {
  it('returns bare /shop when nothing is set', () => {
    expect(buildHref({}, {})).toBe('/shop');
  });

  it('adds a filter', () => {
    expect(buildHref({}, { room: 'Bedroom' })).toBe('/shop?room=Bedroom');
  });

  it('preserves existing params while patching one', () => {
    const href = buildHref({ room: 'Bedroom' }, { brand: 'Jofran' });
    const p = new URL(href, 'https://x').searchParams;
    expect(p.get('room')).toBe('Bedroom');
    expect(p.get('brand')).toBe('Jofran');
  });

  // THE TOGGLE-OFF CONTRACT. All three "unset" shapes must remove the key —
  // if any one of them merely writes an empty value, the filter looks cleared
  // but keeps filtering.
  it('removes a key for null, undefined and empty string', () => {
    for (const off of [null, undefined, ''] as const) {
      const href = buildHref({ room: 'Bedroom', brand: 'Jofran' }, { room: off });
      expect(href).not.toContain('room=');
      expect(href).toContain('brand=Jofran');
    }
  });

  it('drops falsy incoming params rather than emitting empty ones', () => {
    expect(buildHref({ room: '', brand: 'Jofran' }, {})).toBe('/shop?brand=Jofran');
  });

  it('url-encodes values with spaces and symbols', () => {
    const href = buildHref({}, { collection: 'Midnight ICE & Co' });
    expect(href).not.toMatch(/ (?=[A-Za-z])/);
    expect(new URL(href, 'https://x').searchParams.get('collection')).toBe('Midnight ICE & Co');
  });

  it('overwrites rather than appends when patching an existing key', () => {
    const href = buildHref({ room: 'Bedroom' }, { room: 'Living Room' });
    expect(new URL(href, 'https://x').searchParams.getAll('room')).toEqual(['Living Room']);
  });
});

describe('PRICE_BUCKETS', () => {
  // Contiguous, non-overlapping, and open-ended at both ends — otherwise some
  // price has no bucket and those products are unreachable by price filtering.
  it('covers the range with no gap or overlap', () => {
    expect(PRICE_BUCKETS[0].min).toBeUndefined();
    expect(PRICE_BUCKETS[PRICE_BUCKETS.length - 1].max).toBeUndefined();
    for (let i = 1; i < PRICE_BUCKETS.length; i++) {
      expect(PRICE_BUCKETS[i].min).toBe(PRICE_BUCKETS[i - 1].max);
    }
  });

  it('is ordered ascending', () => {
    const mins = PRICE_BUCKETS.map(b => Number(b.min ?? 0));
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });
});

describe('SORTS', () => {
  it('offers "Featured" as the empty-value default', () => {
    expect(SORTS[0].value).toBe('');
  });

  it('has unique values', () => {
    const vals = SORTS.map(s => s.value);
    expect(new Set(vals).size).toBe(vals.length);
  });
});

describe('pageOf', () => {
  it('defaults to page 1 when absent', () => {
    expect(pageOf({})).toBe(1);
  });

  it('reads a positive integer', () => {
    expect(pageOf({ page: '3' })).toBe(3);
  });

  it('treats anything not a positive integer as page 1', () => {
    // These arrive straight off the URL, so they are attacker-controlled and
    // must not turn into a negative offset or a NaN in the API query.
    for (const page of ['abc', '', '0', '-3', '1.5e9', 'NaN', '٣']) {
      expect(pageOf({ page }), page).toBeGreaterThanOrEqual(1);
    }
    expect(pageOf({ page: '-3' })).toBe(1);
    expect(pageOf({ page: 'abc' })).toBe(1);
  });
});

describe('pageCount', () => {
  it('is always at least one page, even for an empty result set', () => {
    expect(pageCount(0)).toBe(1);
  });

  it('rounds a partial last page up', () => {
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
    expect(pageCount(147)).toBe(4); // Recliner, the real worst case
  });
});

describe('buildHref — pagination', () => {
  it('drops the page when any filter changes', () => {
    // A shopper on page 4 of the sofas who picks Grey must land on page 1 of the
    // new result set, not on a page 4 that may not exist.
    expect(buildHref({ page: '4' }, { color_family: 'Grey' })).toBe('/shop?color_family=Grey');
  });

  it('keeps the other filters when only the page changes', () => {
    const href = buildHref({ color_family: 'Grey', sort: 'price_asc' }, { page: '2' });
    expect(href).toContain('color_family=Grey');
    expect(href).toContain('sort=price_asc');
    expect(href).toContain('page=2');
  });

  it('never emits ?page=1 — it is a duplicate URL of the unparamed page', () => {
    expect(buildHref({}, { page: '1' })).toBe('/shop');
    expect(buildHref({ color_family: 'Grey' }, { page: '1' })).toBe('/shop?color_family=Grey');
  });

  it('removes the page when passed null', () => {
    expect(buildHref({ page: '5' }, { page: null })).toBe('/shop');
  });
});
