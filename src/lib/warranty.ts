// Warranty-by-brand registry — the single source of truth for the /warranty
// page and the PDP "Warranty" link.
//
// `brand` MUST match the vendor name exactly as it appears on products
// (p.vendor.name) so the PDP deep link resolves. `url` is the posted
// warranty — either the manufacturer's own public page, or a file we host at
// /warranties/*.pdf (drop it in flipsies-storefront/public/warranties/ and set
// the url). `summary` is a SHORT, verified coverage line taken from the
// manufacturer's own document — leave it null rather than guessing, since
// warranty terms are a legal promise.
//
// This is the curated FEATURED set (Jett, 2026-07-17). Add rows as we gather
// docs for more brands.

export interface WarrantyBrand {
  /** Must match the vendor name exactly as it appears on products (p.vendor.name). */
  brand: string;
  /** Link to the posted warranty — the maker's page or a hosted /warranties/*.pdf. Null = not posted yet. */
  url: string | null;
  /** Short, verified coverage summary. Null until confirmed against the document. */
  summary: string | null;
}

/** Stable, URL-safe id for a brand — used for the /warranty#<slug> deep link. */
export function brandSlug(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Summaries verified against each manufacturer's own warranty page (2026-07-17).
export const WARRANTY_BRANDS: WarrantyBrand[] = [
  {
    brand: 'Jackson Catnapper',
    url: 'https://www.catnapper.com/Warranty',
    summary: 'Limited lifetime warranty on recliner mechanisms and spring units; labor and shipping covered for 1 year from purchase.',
  },
  {
    brand: 'Southern Motion',
    url: 'https://www.southernmotion.com/warranty-info/',
    summary: 'Lifetime on the reclining mechanism; 5 years on frame, springs and cushions; 3 years on motors; 1 year on electrical parts and upholstery.',
  },
  {
    brand: 'Revive (Southern Motion)',
    url: 'https://www.southernmotion.com/resources/revive-warranty/',
    summary: 'Southern Motion’s Revive line — see the Revive warranty for its coverage terms.',
  },
  {
    brand: 'Fusion',
    url: 'https://www.fusionfurnitureinc.com/warranty-info/',
    summary: '5-year limited warranty on frames, 3-year on foam seat-cushion cores, and 1 year of labor from the date of purchase.',
  },
  {
    brand: 'Steve Silver',
    url: 'https://stevesilver.com/warranty-4/',
    summary: 'Limited warranty against defects in materials and workmanship, with separate upholstery and casegoods terms.',
  },
  {
    brand: 'Luke Leather',
    url: 'https://lukeleather.com/warranty/',
    summary: 'Limited warranty against manufacturer defects for the original purchaser; claims filed through your dealer with proof of purchase.',
  },
  {
    brand: 'Hooker Furniture',
    url: 'https://hookerfurnishings.com/warranty',
    summary: 'Motion furniture: 5-year limited warranty on frames, cushions, mechanisms and motorized parts. Upholstery: 1-year limited warranty.',
  },
  {
    brand: 'Leather Italia',
    url: '/warranties/leather-italia-warranty.pdf',
    summary: 'Stationary: 5-year frame & seat suspension, 2-year cushions & foam, 1-year leather. Motion: 2-year frame, springs & reclining mechanism, 1-year leather & motor. Labor 1 year (pre-approved). Claims filed through your dealer.',
  },
  {
    brand: 'MLily',
    url: 'https://mlilyusa.com/pages/warranty/',
    summary: 'Limited warranty covering manufacturing defects — 10, 5, or 3 years by product. Adjustable bases: 10-year frame / 2-year electronics.',
  },
  {
    brand: 'Elements International',
    url: 'https://www.elementsgrp.com/claimspolicy.inc',
    summary: 'Manufacturer defect claims are handled through the retailer with proof of purchase — see the Elements claims policy.',
  },
  {
    brand: 'Crown Mark',
    url: null,
    summary: 'Crown Mark does not issue a consumer manufacturer’s warranty; coverage on Crown Mark pieces is handled directly through Flipsies — contact us.',
  },
  // Featured, docs pending — no official public warranty page located yet.
  // Populate url (+ a verified summary) once the manufacturer document is in hand.
  {
    brand: 'Riverside',
    url: null,
    summary: null,
  },
  {
    brand: 'Jofran',
    url: null,
    summary: null,
  },
  {
    brand: 'Chairs America',
    url: null,
    summary: null,
  },
];

const BY_BRAND = new Map(WARRANTY_BRANDS.map((w) => [w.brand.toLowerCase(), w]));

/** Look up a brand's warranty entry by vendor name (case-insensitive). */
export function warrantyForBrand(brand: string | null | undefined): WarrantyBrand | null {
  if (!brand) return null;
  return BY_BRAND.get(brand.toLowerCase()) ?? null;
}
