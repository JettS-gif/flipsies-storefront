// ── Sectional configurator data ────────────────────────────────────────────
//
// The builder is driven entirely by the backend: GET /storefront/sectional-
// families lists the families that have stock, and /sectional-families/:family
// returns the piece types that family actually carries, already normalized to
// the canonical `products.sectional_piece_type` vocabulary. PIECE_META below
// supplies display labels/hints/grouping keyed by that canonical type.
//
// HISTORY, because it explains why there is no matcher here. This file began as
// a port of DeliverDeskFrontEnd/src/sectional/builder.js and carried its own
// client-side SKU matcher (SECTIONAL_PIECES + matchPieceToProduct +
// matchConfiguration + configurationTotal). That matcher keyed on hyphenated
// slugs — 'rsf-sofa-corner' — while the column stores Title-Case labels
// ('RSF Sofa w/ Corner'), so its hard filter dropped every candidate and it
// could never match anything. The admin builder hit the identical bug and fixed
// it on 2026-07-23 by making `id` the canonical value; the storefront port was
// never updated, and was superseded by the server-driven endpoints before
// anyone noticed. Removed 2026-08-23 — dead code, not a fix, since nothing had
// called it since the endpoints landed.
//
// The lesson worth keeping: a piece type has ONE vocabulary and the database
// owns it. Do not reintroduce a local slug list.

import { serverUa } from '@/lib/api';

// Module-local, matching the sibling libs (facets.ts, packages.ts). The repo
// declares this in eight places; consolidating it is its own change.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app';

/**
 * Fetch a sectional endpoint.
 *
 * serverUa() and NOT catalogAuth(): both endpoints are deliberately ungated
 * because SectionalWizard.tsx is 'use client' and calls them from the browser,
 * where a shared secret would ship inside the JS bundle. serverUa() is a no-op
 * client-side — browsers forbid setting User-Agent — so it is correct in both
 * contexts.
 *
 * Cached 60s: inventory changes matter, but not on a per-click basis.
 */
async function fetchSectional(path: string): Promise<Response> {
  return fetch(API_BASE + path, { next: { revalidate: 60 }, headers: serverUa() });
}

/** Shape returned by GET /storefront/sectional-families */
export interface SectionalFamily {
  family:       string;
  colors:       string[];
  piece_count:  number;
  sample_image: string | null;
  /** True when any in-stock piece of this family is a clearance sell-through unit. */
  has_clearance?: boolean;
}

/**
 * Fetch the list of sectional families currently available on the
 * storefront. Only collections with at least one in-stock, published
 * piece are returned.
 */
export async function fetchSectionalFamilies(): Promise<SectionalFamily[]> {
  const res = await fetchSectional('/storefront/sectional-families');
  if (!res.ok) throw new Error('Failed to load sectional families');
  const json = (await res.json()) as { data: SectionalFamily[] };
  return json.data || [];
}

// ── Family detail (canonical piece types) ─────────────────────────────────

export const PIECE_META: Record<string, { label: string; hint?: string; group: string; order: number }> = {
  'LSF Sofa':            { label: 'LSF Sofa',            group: 'Sofas',     order: 1, hint: 'Sofa with a left-facing arm' },
  'RSF Sofa':            { label: 'RSF Sofa',            group: 'Sofas',     order: 2, hint: 'Sofa with a right-facing arm' },
  'Armless Sofa':        { label: 'Armless Sofa',        group: 'Sofas',     order: 3, hint: 'Three seats, no arms — fills the middle' },
  'LSF Sofa w/ Corner':  { label: 'LSF Sofa w/ Corner',  group: 'Sofas',     order: 4, hint: 'Left-arm sofa with a built-in corner' },
  'RSF Sofa w/ Corner':  { label: 'RSF Sofa w/ Corner',  group: 'Sofas',     order: 5, hint: 'Right-arm sofa with a built-in corner' },
  'LSF Loveseat':        { label: 'LSF Loveseat',        group: 'Loveseats', order: 1, hint: 'Two seats with a left arm' },
  'RSF Loveseat':        { label: 'RSF Loveseat',        group: 'Loveseats', order: 2, hint: 'Two seats with a right arm' },
  'Armless Loveseat':    { label: 'Armless Loveseat',    group: 'Loveseats', order: 3, hint: 'Two seats, no arms' },
  'LSF Chaise':          { label: 'LSF Chaise',          group: 'Chaises',   order: 1, hint: 'Extended seat, left-arm side' },
  'RSF Chaise':          { label: 'RSF Chaise',          group: 'Chaises',   order: 2, hint: 'Extended seat, right-arm side' },
  'LSF Cuddler':         { label: 'LSF Cuddler',         group: 'Chaises',   order: 3, hint: 'Wide angled lounge, left-arm side' },
  'RSF Cuddler':         { label: 'RSF Cuddler',         group: 'Chaises',   order: 4, hint: 'Wide angled lounge, right-arm side' },
  'LSF Chair':           { label: 'LSF Chair',           group: 'Chairs',    order: 1, hint: 'Single seat with a left arm' },
  'RSF Chair':           { label: 'RSF Chair',           group: 'Chairs',    order: 2, hint: 'Single seat with a right arm' },
  'Armless Chair':       { label: 'Armless Chair',       group: 'Chairs',    order: 3, hint: 'Middle seat, no arms' },
  'Armless Recliner':    { label: 'Armless Recliner',    group: 'Chairs',    order: 4, hint: 'Reclining middle seat, no arms' },
  'Corner':              { label: 'Corner',              group: 'Corners',   order: 1, hint: '90° turn joining two runs' },
  'Wedge':               { label: 'Wedge',               group: 'Corners',   order: 2, hint: 'Wedge-shaped corner connector' },
  'Console':             { label: 'Console',             group: 'Consoles',  order: 1, hint: 'Storage / cupholder console' },
  'Ottoman':             { label: 'Ottoman',             group: 'Ottomans',  order: 1, hint: 'Matching ottoman' },
};

export const GROUP_ORDER = ['Sofas', 'Loveseats', 'Chaises', 'Chairs', 'Corners', 'Consoles', 'Ottomans'];

export interface SectionalPieceProduct {
  id: string;
  sku: string;
  name: string;
  color: string | null;
  price: number;
  image_url: string | null;
  /** Raw catalog dimensions string, e.g. `48"W x 46"D x 39"H` (null when unknown). */
  dimensions?: string | null;
  /** Recline mechanism (products.sectional_motion) — null for structural pieces. */
  motion?: string | null;
}
export interface SectionalFamilyDetail {
  family: string;
  colors: string[];
  images: string[];
  pieces: { piece_type: string; products: SectionalPieceProduct[] }[];
}

/** Fetch ONE family's colors, gallery, and the piece types it actually carries. */
export async function fetchSectionalFamily(family: string): Promise<SectionalFamilyDetail | null> {
  const res = await fetchSectional('/storefront/sectional-families/' + encodeURIComponent(family));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load sectional family');
  return (await res.json()) as SectionalFamilyDetail;
}
