import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveCatalogSlug, categoryPath, slugify, ROOM_SLUGS } from './catalogSlugs';

// The live category list as of 2026-08-05, trimmed to the cases that matter:
// the three room/category collisions, the dresser-mirror slug collision, and a
// handful of ordinary multi-word names.
const CATEGORIES = [
  'Accent Cabinet',
  'Bed',
  'Bed Parts',
  'Console Table',
  'Counter Height Chair',
  'Dresser & Mirror',
  'Dresser Mirror',
  'Dresser and mirror',
  'Living Room',
  'Mattress',
  'Outdoor',
  'Recliner',
  'Rug',
  'Sectional',
  'Sofa',
];

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Accent Cabinet')).toBe('accent-cabinet');
    expect(slugify('Counter Height Chair')).toBe('counter-height-chair');
  });

  it('collapses punctuation without leaving edge hyphens', () => {
    expect(slugify('Dresser & Mirror')).toBe('dresser-mirror');
    expect(slugify('Storage + Display')).toBe('storage-display');
    expect(slugify('Desk (ONLY)')).toBe('desk-only');
  });
});

describe('resolveCatalogSlug — room slugs', () => {
  // These are the URLs the homepage tiles, the sitewide footer, and every
  // legacy old-site 308 have always generated. Before the resolver they matched
  // no category and rendered an empty HTTP 200, which is what silently ate the
  // entire domain migration's SEO equity.
  it('resolves every slug the nav generates', () => {
    for (const [slug, room] of Object.entries(ROOM_SLUGS)) {
      const r = resolveCatalogSlug(slug, CATEGORIES);
      expect(r, slug).toMatchObject({ kind: 'room', value: room });
    }
  });

  it('canonicalises the home-office alias onto /shop/office', () => {
    expect(resolveCatalogSlug('home-office', CATEGORIES)).toEqual({
      kind: 'room',
      value: 'Office',
      canonical: '/shop/office',
    });
  });

  // /shop/sectionals, /shop/deals and /shop/Sectional are 308'd in next.config.ts
  // and never reach this resolver — a config redirect runs before rendering, so
  // it can still set a status code, which an in-page redirect on this streaming
  // segment cannot. They resolve to nothing here by design.
  it('leaves the config-redirected slugs unresolved', () => {
    expect(resolveCatalogSlug('sectionals', CATEGORIES)).toEqual({ kind: 'none' });
    expect(resolveCatalogSlug('deals', CATEGORIES)).toEqual({ kind: 'none' });
  });
});

describe('resolveCatalogSlug — room/category collisions', () => {
  // Three category names also exist as room names. The winner is whichever
  // holds the inventory a shopper following that link expects.
  it('gives living-room to the room (941 products) over the category (1)', () => {
    expect(resolveCatalogSlug('living-room', CATEGORIES)).toMatchObject({ kind: 'room', value: 'Living Room' });
  });

  it('gives outdoor to the room, which is the superset', () => {
    expect(resolveCatalogSlug('outdoor', CATEGORIES)).toMatchObject({ kind: 'room', value: 'Outdoor' });
  });

  it('gives rug to the CATEGORY (66 products) over the room (1)', () => {
    expect(resolveCatalogSlug('rug', CATEGORIES)).toMatchObject({ kind: 'category', value: 'Rug' });
  });

  it('does not route the empty "Storage + Display" room', () => {
    expect(resolveCatalogSlug('storage-display', CATEGORIES)).toEqual({ kind: 'none' });
  });
});

describe('resolveCatalogSlug — categories', () => {
  it('resolves a clean slug', () => {
    expect(resolveCatalogSlug('accent-cabinet', CATEGORIES)).toEqual({
      kind: 'category',
      value: 'Accent Cabinet',
      canonical: '/shop/accent-cabinet',
    });
  });

  it('still resolves the legacy exact-name form, pointing its canonical at the slug', () => {
    expect(resolveCatalogSlug('Accent Cabinet', CATEGORIES)).toEqual({
      kind: 'category',
      value: 'Accent Cabinet',
      canonical: '/shop/accent-cabinet',
    });
  });

  it('404s an unresolvable segment instead of rendering an indexable empty page', () => {
    expect(resolveCatalogSlug('zzz-not-a-category', CATEGORIES)).toEqual({ kind: 'none' });
    expect(resolveCatalogSlug('', CATEGORIES)).toEqual({ kind: 'none' });
    expect(resolveCatalogSlug('   ', CATEGORIES)).toEqual({ kind: 'none' });
  });
});

describe('shared-slug categories are never orphaned', () => {
  // "Dresser & Mirror" (3), "Dresser Mirror" (3) and "Dresser and mirror" (1)
  // are one category spelled three ways — a data merge the office still owes.
  it('awards the shared slug to the typeset spelling', () => {
    expect(resolveCatalogSlug('dresser-mirror', CATEGORIES)).toEqual({
      kind: 'category',
      value: 'Dresser & Mirror',
      canonical: '/shop/dresser-mirror',
    });
  });

  it('keeps the shadowed spelling reachable under its exact name', () => {
    expect(resolveCatalogSlug('Dresser Mirror', CATEGORIES)).toMatchObject({
      kind: 'category',
      value: 'Dresser Mirror',
    });
  });

  it('self-canonicals the shadowed spelling instead of pointing at the winner', () => {
    // categoryPath feeds the <link rel="canonical">. If a shadowed spelling
    // claimed /shop/dresser-mirror it would declare itself a duplicate of a
    // DIFFERENT category's page and hand its 3 products' equity away.
    expect(categoryPath('Dresser Mirror', CATEGORIES)).toBe('/shop/Dresser%20Mirror');
    expect(categoryPath('Dresser & Mirror', CATEGORIES)).toBe('/shop/dresser-mirror');
  });

  it('gives a uniquely-slugged category the clean slug', () => {
    expect(categoryPath('Counter Height Chair', CATEGORIES)).toBe('/shop/counter-height-chair');
  });
});

// The resolver deliberately returns `none` for these, on the understanding that
// next.config.ts 308s them first. If those entries are ever removed, the slugs
// silently start 404ing instead — this is the only thing holding the two halves
// together, so it is a contract test rather than a comment.
describe('next.config.ts owns the slugs the resolver declines', () => {
  const config = readFileSync(new URL('../../next.config.ts', import.meta.url), 'utf8');

  it.each([
    ['/shop/sectionals', '/sectionals'],
    ['/shop/sectional', '/sectionals'],
    ['/shop/Sectional', '/sectionals'],
    ['/shop/deals', '/deals'],
  ])('308s %s to %s', (source, destination) => {
    const re = new RegExp(
      `source:\\s*["']${source}["'][^}]*destination:\\s*["']${destination}["'][^}]*permanent:\\s*true`,
    );
    expect(config).toMatch(re);
  });

  it('sends the legacy room paths to slugs the resolver actually resolves', () => {
    for (const [, dest] of config.matchAll(/room\("\/[^"]+",\s*"(\/shop\/[^"]+)"\)/g)) {
      const slug = dest.replace('/shop/', '');
      expect(resolveCatalogSlug(slug, CATEGORIES).kind, dest).not.toBe('none');
    }
  });
});
