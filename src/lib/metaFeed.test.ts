import { describe, it, expect } from 'vitest';
import type { Product } from '@/lib/api';
import { buildMetaFeed, labelCell, META_EXTRA_COLUMNS } from '@/lib/metaFeed';
import { GOOGLE_FEED_COLUMNS, googleRow } from '@/lib/googleFeed';

const base: Product = {
  id: 'abc-123', sku: '101-113-14', name: 'FLASH DANCE · Swivel · Chair', collection: 'Flash Dance',
  color: 'Charcoal', material: 'Polyester', material_class: null, type: 'Swivel Chair', category: 'Accent Chair',
  room: 'Living Room', retail_price: 699.97, compare_at_price: 999.97, in_stock: true,
  vendor: { name: 'Southern Motion' }, sectional_piece_type: null, sectional_family: null,
  images: ['https://cdn.example.com/a.jpg'], dimensions: '29"W x 35"D x 39"H', variant_group_id: null,
};
const rows = (feed: string) => feed.split('\n').slice(1, -1).map((r) => r.split('\t'));

describe('meta feed', () => {
  it('is the Google row plus internal_label', () => {
    const feed = buildMetaFeed([base], { 'abc-123': ['best_seller'] });
    expect(feed.split('\n')[0].split('\t')).toEqual([...GOOGLE_FEED_COLUMNS, ...META_EXTRA_COLUMNS]);
    const [row] = rows(feed);
    const g = googleRow(base).split('\t');
    expect(row.slice(1, g.length)).toEqual(g.slice(1));
    expect(row.at(-1)).toBe("['best_seller']");
  });

  it("writes labels in Meta's list syntax and drops unknown ones", () => {
    expect(labelCell(base, { 'abc-123': ['new_arrival', 'deal', 'junk'] })).toBe("['new_arrival','deal']");
    expect(labelCell(base, {})).toBe('');
  });

  it('uses the SKU as the id, because that is what the pixel reports as content_ids', () => {
    expect(rows(buildMetaFeed([base], {}))[0][0]).toBe('101-113-14');
  });

  it('a case-insensitive SKU collision keeps the first and gives the second its UUID', () => {
    const a = { ...base, id: 'uuid-a', sku: 'df4672' };
    const b = { ...base, id: 'uuid-b', sku: 'Df4672' };
    const ids = rows(buildMetaFeed([a, b], {})).map((r) => r[0]);
    expect(ids).toEqual(['df4672', 'uuid-b']);
  });

  it('never publishes a compare-at / sale price', () => {
    const feed = buildMetaFeed([base], {});
    expect(feed).not.toContain('sale_price');
    expect(feed).not.toContain('999.97');
  });
});
