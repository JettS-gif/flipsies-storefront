import { describe, it, expect } from 'vitest';
import { buildLocalFeed, localRow, storeCodeFor, LOCAL_FEED_COLUMNS, type ShowroomInventoryRow } from '@/lib/localFeed';

const IRONDALE = '8761534273338357514';
const row = (product_id: string, location_name: string, location_id = 'loc'): ShowroomInventoryRow =>
  ({ product_id, location_id, location_name });

describe('storeCodeFor', () => {
  // The backend sends the warehouse-side name; SHOWROOMS holds the customer
  // facing entry. Matched on slug so renaming a location in DeliverDesk cannot
  // silently empty the feed.
  it('maps the backend location name to the Google store code', () => {
    expect(storeCodeFor('Irondale Showroom')).toBe(IRONDALE);
    expect(storeCodeFor('irondale showroom')).toBe(IRONDALE);
  });

  // Hoover is blocked on a Business Manager org conflict. A row with no store
  // code would be rejected; a row under the WRONG code would send someone to
  // the wrong building.
  it('returns null for a showroom with no linked Business Profile', () => {
    expect(storeCodeFor('Hoover Showroom')).toBeNull();
  });

  it('returns null for anything that is not a showroom', () => {
    expect(storeCodeFor('Irondale Warehouse')).toBeNull();
    expect(storeCodeFor('Pelham 2790')).toBeNull();
    expect(storeCodeFor('')).toBeNull();
  });
});

describe('localRow', () => {
  it('emits one cell per declared column', () => {
    expect(localRow('p1', IRONDALE).split('\t')).toHaveLength(LOCAL_FEED_COLUMNS.length);
  });

  // pickup_method 'buy' is a real claim: the storefront supports
  // buy-online-collect-in-store, and 40% of orders already complete that way.
  it('claims in-store pickup, same day', () => {
    const v = localRow('p1', IRONDALE).split('\t');
    const c = Object.fromEntries(LOCAL_FEED_COLUMNS.map((k, i) => [k, v[i]]));
    expect(c.store_code).toBe(IRONDALE);
    expect(c.id).toBe('p1');
    expect(c.availability).toBe('in_stock');
    expect(c.pickup_method).toBe('buy');
    expect(c.pickup_sla).toBe('same_day');
  });
});

describe('buildLocalFeed', () => {
  const eligible = new Set(['p1', 'p2']);

  it('leads with the header row', () => {
    expect(buildLocalFeed([], eligible).trim()).toBe(LOCAL_FEED_COLUMNS.join('\t'));
  });

  it('emits a row for a product on a linked floor', () => {
    const out = buildLocalFeed([row('p1', 'Irondale Showroom')], eligible).trim().split('\n');
    expect(out).toHaveLength(2);
    expect(out[1]).toContain(IRONDALE);
    expect(out[1]).toContain('p1');
  });

  // Until Hoover's Business Manager conflict clears, its floor stock must not
  // appear at all rather than appear under Irondale's code.
  it('drops stock from an unlinked showroom entirely', () => {
    expect(buildLocalFeed([row('p1', 'Hoover Showroom')], eligible).trim().split('\n')).toHaveLength(1);
  });

  // A local row is supplemental — Google joins it to an online row by id, so a
  // row with no counterpart is orphaned and can only produce noise.
  it('drops products the online feed does not publish', () => {
    const out = buildLocalFeed([row('ghost', 'Irondale Showroom')], eligible).trim().split('\n');
    expect(out).toHaveLength(1);
  });

  // A product can occupy several bins in one showroom; Google wants one row per
  // product per store.
  it('collapses multiple bins in the same showroom to one row', () => {
    const rows = [row('p1', 'Irondale Showroom', 'binA'), row('p1', 'Irondale Showroom', 'binB')];
    expect(buildLocalFeed(rows, eligible).trim().split('\n')).toHaveLength(2);
  });

  it('keeps distinct products apart', () => {
    const rows = [row('p1', 'Irondale Showroom'), row('p2', 'Irondale Showroom')];
    expect(buildLocalFeed(rows, eligible).trim().split('\n')).toHaveLength(3);
  });

  it('never emits a row without a store code', () => {
    const rows = [row('p1', 'Hoover Showroom'), row('p2', 'Irondale Showroom')];
    for (const line of buildLocalFeed(rows, eligible).trim().split('\n').slice(1)) {
      expect(line.split('\t')[0]).toBe(IRONDALE);
    }
  });
});
