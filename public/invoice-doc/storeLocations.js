// utils/storeLocations.js
// Single source of truth for Flipsies' retail showroom contact details
// printed on customer-facing receipts / agreements.
//
// Why this exists (2026-06-14): invoicePrint.js hard-coded the Irondale
// store address + phone in the header AND the "Customer Pick Up" block, so
// every printed receipt showed Irondale's info even for a Hoover sale.
// The printed store is now resolved from the sale itself.
//
// Detection priority (operator decision Jett 2026-06-14):
//   1. inv.salesperson.store  — the selling rep's home store. The salesperson
//                               is the source of truth (Jett 2026-06-14); the
//                               invoice has no independent store assignment —
//                               inv.location is just auto-filled from this via
//                               invSalesAutoLoc. Exposed by the getInvoice
//                               salesperson join.
//   2. inv.location           — fallback for older rows where the rep had no
//                               store set but the form Location was chosen
//                               ("Hoover Showroom" / "Irondale Showroom").
//   3. DEFAULT_STORE_KEY      — terminal catch-all (Irondale = HQ) so an
//                               admin-written invoice with no store on either
//                               side never prints a blank header.

export const STORE_LOCATIONS = {
  irondale: {
    key:     'irondale',
    name:    'Irondale Showroom',
    address: '1811 Crestwood Blvd, Irondale, AL 35210',
    phone:   '(205) 957-4001',
    website: 'flipsiesfurniture.com',
  },
  hoover: {
    key:     'hoover',
    name:    'Hoover Showroom',
    address: '1709 Montgomery Highway S, Hoover, AL 35244',
    phone:   '(205) 238-5076',
    website: 'flipsiesfurniture.com',
  },
};

// Irondale is the HQ / default — keeps today's effective behavior when
// nothing else resolves (operator decision Jett 2026-06-14).
export const DEFAULT_STORE_KEY = 'irondale';

// Normalize an arbitrary store/location label to a STORE_LOCATIONS key.
// Substring match mirrors invSalesAutoLoc's fuzzy approach so the same
// inputs resolve consistently: "Hoover", "Hoover Showroom", "hoover" all
// land on the hoover key. Returns null when nothing matches.
export function storeKeyFromLabel(label) {
  if (!label) return null;
  const s = String(label).toLowerCase();
  if (s.includes('hoover'))   return 'hoover';
  if (s.includes('irondale')) return 'irondale';
  return null;
}

// Resolve the showroom contact block for a printed invoice. Always returns
// a STORE_LOCATIONS entry (falls back to the default), never null.
export function resolveStoreLocation(inv) {
  const key = storeKeyFromLabel(inv?.salesperson?.store)
    || storeKeyFromLabel(inv?.location)
    || DEFAULT_STORE_KEY;
  return STORE_LOCATIONS[key] || STORE_LOCATIONS[DEFAULT_STORE_KEY];
}
