import { describe, it, expect } from 'vitest';
import { META_PIXEL_IDS, GA_ID } from './analytics';

// Locks the pixel roster itself, not the event shapes (events.test.ts owns
// those). A pixel silently dropped from this list does not fail anything, does
// not log anything, and does not change a single page visibly — the ad account
// behind it simply stops receiving ViewContent / AddToCart / Purchase and its
// campaigns quietly lose the ability to optimise. That is the failure mode this
// file exists to make loud, and it is exactly what had already happened to
// 1647344162308893 before 2026-08-04.

describe('Meta pixel roster', () => {
  it('initialises every ad account\'s pixel', () => {
    // One per ad account. fbq('track') fires to EVERY initialised pixel, so
    // presence in this list is the whole of the wiring.
    expect(META_PIXEL_IDS).toContain('566032973955511');
    expect(META_PIXEL_IDS).toContain('1503664690977139');
    // Added 2026-08-04: an ad account was serving traffic against a pixel this
    // site never initialised, so it had no signal at all to optimise against.
    expect(META_PIXEL_IDS).toContain('1647344162308893');
  });

  it('carries no duplicates — a doubled id double-counts every event', () => {
    expect(new Set(META_PIXEL_IDS).size).toBe(META_PIXEL_IDS.length);
  });

  it('every id is a bare numeric string, safe to inline into the fbq snippet', () => {
    // layout.tsx interpolates these straight into an inline <Script> as
    // fbq('init','<id>') — anything with a quote or newline would break the tag
    // and take the whole pixel down, not just its own init.
    for (const id of META_PIXEL_IDS) {
      expect(id).toMatch(/^\d{10,20}$/);
    }
  });

  it('GA4 stays configured alongside — the two channels are independent', () => {
    // Meta and GA4 fire from the same helpers; losing one must not read as
    // losing both.
    expect(GA_ID).toMatch(/^G-[A-Z0-9]+$/);
  });
});
