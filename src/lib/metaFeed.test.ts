import { describe, it, expect } from 'vitest';
import type { Product } from '@/lib/api';
import { buildMetaFeed, labelCells, META_LABEL_COLUMNS } from '@/lib/metaFeed';
import { GOOGLE_FEED_COLUMNS, googleRow } from '@/lib/googleFeed';

const base: Product = {
  id: 'abc-123', sku: '101-113-14', name: 'FLASH DANCE · Swivel · Chair', collection: 'Flash Dance',
  color: 'Charcoal', material: 'Polyester', material_class: null, type: 'Swivel Chair', category: 'Accent Chair',
  room: 'Living Room', retail_price: 699.97, compare_at_price: 999.97, in_stock: true,
  vendor: { name: 'Southern Motion' }, sectional_piece_type: null, sectional_family: null,
  images: ['https://cdn.example.com/a.jpg'], dimensions: '29"W x 35"D x 39"H', variant_group_id: null,
};

describe('meta feed', () => {
  it('is the Google row plus three label columns', () => {
    const [header, row] = buildMetaFeed([base], { 'abc-123': ['best_seller'] }).split('\n');
    expect(header.split('\t')).toEqual([...GOOGLE_FEED_COLUMNS, ...META_LABEL_COLUMNS]);
    const g = googleRow(base).split('\t');
    expect(row.split('\t').slice(1, g.length)).toEqual(g.slice(1));
    expect(row.split('\t').slice(-3)).toEqual(['', 'best_seller', '']);
  });

  it('uses the SKU as the id, because that is what the pixel reports as content_ids', () => {
    const row = buildMetaFeed([base], {}).split('\n')[1].split('\t');
    expect(row[0]).toBe('101-113-14');
  });

  it('puts each label in its own fixed column so product sets can filter on it', () => {
    expect(labelCells(base, { 'abc-123': ['deal', 'new_arrival'] })).toEqual(['new_arrival', '', 'deal']);
    expect(labelCells(base, {})).toEqual(['', '', '']);
  });

  it('never publishes a compare-at / sale price', () => {
    const feed = buildMetaFeed([base], {});
    expect(feed).not.toContain('sale_price');
    expect(feed).not.toContain('999.97');
  });
});
