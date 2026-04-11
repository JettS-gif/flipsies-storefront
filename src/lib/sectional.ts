// ── Sectional configurator data + matcher (Phase 3.A.1) ────────────────────
//
// Ported from DeliverDeskFrontEnd/src/sectional/builder.js. The admin app
// uses a canvas-based drag-and-drop configurator; the storefront starts
// with a simpler list-based wizard that covers the same SKU matching
// logic without the visual layout. A future Phase 3.A.2 will add the
// full canvas port for desktop shoppers and showroom kiosks.
//
// The data model must stay in sync with products.sectional_piece_type.
// Every `id` in SECTIONAL_PIECES maps 1:1 to a value of that column in
// Supabase. The DeliverDesk builder uses the same ids, so when we ship
// 3.A.2 we can share this file across both apps if we extract it to a
// shared package.

import { api, type Product } from '@/lib/api';

/** Group labels used to cluster pieces in the wizard palette */
export type SectionalGroup = 'Chairs' | 'Loveseats' | 'Sofas' | 'Chaises' | 'Ottomans';

/**
 * Minimal piece definition for the list wizard. The full canvas build
 * (Phase 3.A.2) will add connector + zone geometry back in from the
 * original DeliverDesk builder source.
 */
export interface SectionalPieceDef {
  id:    string;          // matches products.sectional_piece_type
  label: string;          // display label in the wizard
  group: SectionalGroup;  // palette grouping
  /** Short description shown under the piece name in the wizard */
  hint?: string;
}

export const SECTIONAL_PIECES: SectionalPieceDef[] = [
  // Chairs
  { id: 'armless-chair',   label: 'Armless chair',        group: 'Chairs',   hint: 'Middle seat with no arms — fills between other pieces' },
  { id: 'lsf-chair',       label: 'LSF chair',            group: 'Chairs',   hint: 'Single-seat chair with a left arm (faces the room)' },
  { id: 'rsf-chair',       label: 'RSF chair',            group: 'Chairs',   hint: 'Single-seat chair with a right arm (faces the room)' },
  { id: 'corner',          label: 'Corner',               group: 'Chairs',   hint: '90° turn — joins two runs of a sectional' },

  // Loveseats
  { id: 'armless-love',    label: 'Armless loveseat',     group: 'Loveseats', hint: 'Two seats, no arms — fills between other pieces' },
  { id: 'lsf-love',        label: 'LSF loveseat',         group: 'Loveseats', hint: 'Two seats with a left arm' },
  { id: 'rsf-love',        label: 'RSF loveseat',         group: 'Loveseats', hint: 'Two seats with a right arm' },

  // Sofas
  { id: 'lsf-sofa-corner', label: 'LSF sofa w/ corner',   group: 'Sofas',    hint: 'Three seats with a left arm + built-in corner' },
  { id: 'rsf-sofa-corner', label: 'RSF sofa w/ corner',   group: 'Sofas',    hint: 'Three seats with a right arm + built-in corner' },

  // Chaises
  { id: 'lsf-chaise',      label: 'LSF chaise',           group: 'Chaises',  hint: 'Extended seat for stretching out — left-arm side' },
  { id: 'rsf-chaise',      label: 'RSF chaise',           group: 'Chaises',  hint: 'Extended seat for stretching out — right-arm side' },

  // Ottomans
  { id: 'ottoman',          label: 'Ottoman',              group: 'Ottomans', hint: 'Standard matching ottoman' },
  { id: 'cocktail-ottoman', label: 'Cocktail ottoman',     group: 'Ottomans', hint: 'Oversized ottoman that doubles as a cocktail table' },
];

/** Shape returned by GET /storefront/sectional-families */
export interface SectionalFamily {
  family:       string;
  colors:       string[];
  piece_count:  number;
  sample_image: string | null;
}

/**
 * Fetch the list of sectional families currently available on the
 * storefront. Only collections with at least one in-stock, published
 * piece are returned. Cached for 60 seconds at the fetch layer since
 * inventory changes matter but not on a per-click basis.
 */
export async function fetchSectionalFamilies(): Promise<SectionalFamily[]> {
  const res = await fetch(
    (process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app') +
      '/storefront/sectional-families',
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error('Failed to load sectional families');
  const json = (await res.json()) as { data: SectionalFamily[] };
  return json.data || [];
}

/**
 * Shape of a selection in the wizard. Each entry is one piece type and
 * the quantity the shopper wants, along with the resolved product (SKU
 * + price) once we've matched it against Supabase.
 */
export interface SelectedPiece {
  pieceId:  string;          // SectionalPieceDef.id
  qty:      number;          // how many of this piece type the shopper wants
  matched:  Product | null;  // resolved product after matchPieceToProduct
  error?:   string;          // human-readable mismatch reason
}

/**
 * Match a single piece definition + family + color triple against the
 * storefront catalog. Ported from the DeliverDesk
 * invSectionalAddToInvoice scoring logic so the two apps find the same
 * SKUs for the same query.
 *
 * Scoring rules (highest first):
 *   - Exact sectional_piece_type match (required — returns null otherwise)
 *   - sectional_family matches (+2)
 *   - Color matches on any of (color, name, collection) (+4)
 *   - Product has a DB-tagged sectional_piece_type (+2)
 *   - Minimum score of 1 so unscored matches still return something
 *
 * Returns null if no product matches the piece type at all.
 */
export async function matchPieceToProduct(
  pieceId: string,
  family:  string,
  color:   string,
): Promise<Product | null> {
  // Use the storefront products endpoint with a composed search query.
  // 30 results is plenty — we only need to find the one that best matches
  // family + color within this piece type.
  const def = SECTIONAL_PIECES.find(p => p.id === pieceId);
  if (!def) return null;

  const query = [family, color, def.label].filter(Boolean).join(' ');
  let candidates: Product[] = [];
  try {
    const res = await api.getProducts({ search: query, limit: 30 });
    candidates = res.data || [];
  } catch {
    return null;
  }

  const famLower   = family.toLowerCase();
  const colorLower = color.toLowerCase();

  const scored = candidates
    .map(p => {
      // Hard filter: must be the right piece type. The scoring only
      // runs over products whose sectional_piece_type equals pieceId.
      if (p.sectional_piece_type !== pieceId) return null;

      const dbTagged    = !!p.sectional_piece_type;
      const pFamLower   = (p.sectional_family || '').toLowerCase();
      const familyMatch = !!family && pFamLower === famLower;

      const pColorField = (p.color || '').toLowerCase();
      const pNameLower  = (p.name || '').toLowerCase();
      const pCollection = (p.collection || '').toLowerCase();
      const colorMatch  =
        !!color &&
        (pColorField === colorLower ||
         pColorField.includes(colorLower) ||
         pNameLower.includes(colorLower) ||
         pCollection.includes(colorLower));

      // If the shopper specified a color and this product clearly isn't
      // it, drop the candidate. Prevents wrong-color SKUs from sneaking
      // in when only the piece type matches.
      if (color && !colorMatch) return null;

      const score =
        (colorMatch ? 4 : 0) +
        (dbTagged   ? 2 : 0) +
        (familyMatch ? 2 : 0) ||
        1; // baseline so zero-score matches still beat null

      return { product: p, score };
    })
    .filter((x): x is { product: Product; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.product || null;
}

/**
 * Match an entire sectional configuration against the catalog in one
 * call. Returns the same selection array with each entry's `matched`
 * and `error` fields populated. Items that fail to match carry an
 * error string the wizard can surface to the customer so they can
 * pick a different color or contact the store.
 */
export async function matchConfiguration(
  selections: SelectedPiece[],
  family:     string,
  color:      string,
): Promise<SelectedPiece[]> {
  const resolved = await Promise.all(
    selections
      .filter(s => s.qty > 0)
      .map(async (s) => {
        const matched = await matchPieceToProduct(s.pieceId, family, color);
        return {
          ...s,
          matched,
          error: matched ? undefined : `No ${color || 'matching'} ${SECTIONAL_PIECES.find(p => p.id === s.pieceId)?.label || s.pieceId} available right now.`,
        };
      })
  );
  return resolved;
}

/** Sum the retail price of a resolved configuration (pieces × qty). */
export function configurationTotal(selections: SelectedPiece[]): number {
  return selections.reduce((sum, s) => {
    if (!s.matched || s.qty <= 0) return sum;
    return sum + Number(s.matched.retail_price || 0) * s.qty;
  }, 0);
}
