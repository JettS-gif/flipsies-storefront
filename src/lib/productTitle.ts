import type { Product } from '@/lib/api';

// The PDP used to title itself `collection — color`, discarding product.name —
// the one field that already carried the category noun. A bedroom set's dresser,
// mirror, nightstand, chest and bed therefore collapsed to one identical title:
// 284 duplicate clusters covering 936 of 2,309 PDPs, and 85% of titles with no
// noun at all. Google collapses duplicates, so only one of each cluster could
// rank, and "Allan — Black" matches nothing anybody searches.
//
// The replacement composes the fields already on the record —
// {brand} {collection} {color} {type or category} — which both disambiguates
// and puts the noun people actually type ("black nightstand", "power reclining
// sofa") into the title.

const norm = (s: unknown): string => (s == null ? '' : String(s)).trim().replace(/\s+/g, ' ');

const wordsOf = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Staff append a status marker to the collection on retired lines
// ("Bancroft - DISCONTINUED"). It is an internal flag, not part of the name, and
// it must never reach a title or a <h1>. Same class as the warehouse notes in
// lib/publicDescription — a field doing double duty as a staff scratch pad.
const INTERNAL_MARKER = /\s*[-–—]?\s*\b(discontinued|dnu|do not use|obsolete|closeout)\b\s*$/i;

// One vendor is recorded as "Revive (Southern Motion)" — the parenthetical is
// bookkeeping about who owns the line, not a brand a shopper would search.
const vendorLabel = (v?: { name?: string } | null): string => norm(v?.name).split(' (')[0];

// Vendor catalogs shout: "101 FLASH DANCE", "1157 BANK SHOT". Sentence case reads
// as a product name rather than a warning label. Words carrying a digit (6240P)
// and short abbreviations (LAF, RSF, TV) are left alone — those are meaningful
// as written.
function softenCaps(s: string): string {
  return s
    .split(' ')
    .map((w) => {
      // A word carrying a digit is a model number ("6240P") — never touch it.
      if (/\d/.test(w)) return w;
      // Soften alphabetic RUNS of 4+, not whole words, so punctuation carries
      // through: "Desk (ONLY)" -> "Desk (Only)". Runs shorter than 4 are left
      // alone, which protects abbreviations and line codes like LAF and B&HB.
      return w.replace(/[A-Za-z]{4,}/g, (run) =>
        run === run.toUpperCase() ? run.charAt(0) + run.slice(1).toLowerCase() : run,
      );
    })
    .join(' ');
}

/**
 * The category noun. `type` is the most specific but is only populated on 37%
 * of the catalog, so it falls back to `category` (93%) and then to the trailing
 * segment of `name`, which is formatted "101 FLASH DANCE · Swivel · Chair".
 */
export function categoryNoun(p: Partial<Product>): string {
  const t = norm(p.type);
  if (t) return t;
  const c = norm(p.category);
  if (c) return c;
  const parts = norm(p.name).split('·').map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

// Google truncates a SERP title around 60 characters, and the root layout appends
// " | Flipsies Furniture" on top of whatever this returns.
const TITLE_BUDGET = 60;

/**
 * Display name for the PDP — feeds <title>, <h1>, the breadcrumb, gallery alt
 * text, the Product JSON-LD name, and the TrackEvent label.
 */
export function productTitle(p: Partial<Product>): string {
  const collection = softenCaps(norm(p.collection).replace(INTERNAL_MARKER, ''));
  const parts: string[] = [];
  const seen = new Set<string>();

  // Word-level dedup, not part-level: vendor "Fusion" + collection "Fusion 1140
  // Series" must render "Fusion 1140 Series", never "Fusion Fusion 1140 Series".
  const push = (raw: string) => {
    const kept = norm(raw)
      .split(' ')
      .filter((w) => {
        const key = wordsOf(w).join('');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(' ');
    if (kept) parts.push(kept);
  };

  const vendor = vendorLabel(p.vendor);
  push(vendor);
  push(collection);
  push(softenCaps(norm(p.color)));
  push(softenCaps(categoryNoun(p)));

  let title = parts.join(' ');

  // Over budget, the brand is the cheapest word to lose: the collection and the
  // noun carry the search intent, and the colour is what keeps sibling pieces
  // from colliding again. Never truncate mid-phrase — a mangled title reads
  // worse than a long one.
  if (title.length > TITLE_BUDGET && vendor && parts.length > 1) {
    const withoutVendor = parts.slice(1).join(' ');
    if (withoutVendor) title = withoutVendor;
  }

  // Composition can come out empty when every field is blank; the raw name is
  // always populated and is a better answer than an empty <title>.
  return title || norm(p.name);
}

// Google truncates a meta description around 155-160 characters and treats a
// very short one as thin. The old template was
// `{name} — ${price} at Flipsies Furniture. {description}`, which on the 75% of
// products with no description left a sub-70-character stub — and embedded a
// price that goes stale in Google's cache the moment it changes.
const META_MIN = 70;
const META_MAX = 160;

/**
 * Meta description for a PDP. Prefers real copy; otherwise composes one from
 * the structured fields, with no price in it.
 *
 * @param description already passed through publicDescription() by the caller —
 *   this must never receive a raw `product.description`.
 */
export function productMetaDescription(p: Partial<Product>, description?: string | null): string {
  const real = norm(description);
  if (real.length >= META_MIN) return real.length > META_MAX ? `${real.slice(0, META_MAX - 1).trimEnd()}…` : real;

  const title = productTitle(p);
  const dims = norm(p.dimensions);
  const availability = p.in_stock
    ? 'In stock now — local Birmingham delivery, or see it at our Hoover and Irondale showrooms.'
    : 'Order yours at Flipsies Furniture — Hoover and Irondale showrooms, local Birmingham delivery.';

  // Short real copy leads only when it ADDS something. Most of it is an
  // all-caps echo of the type ("POWER HEADREST LOVESEAT"), which would shout a
  // duplicate of the title back at the reader; if every one of its words is
  // already in the title, drop it.
  const titleWords = new Set(wordsOf(title));
  const addsSomething = real && wordsOf(real).some((w) => !titleWords.has(w));
  const lead = addsSomething ? softenCaps(real).replace(/\.?$/, '.') : `${title}.`;
  const withDims = dims ? `${lead} ${dims.replace(/\.?$/, '.')}` : lead;
  const full = `${withDims} ${availability}`;

  return full.length > META_MAX ? `${full.slice(0, META_MAX - 1).trimEnd()}…` : full;
}
