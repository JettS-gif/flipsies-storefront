// "Complete bed" bundles: an upholstered bed + mattress at one price (Queen $499,
// King $599), sold from the bed pyramid in Hoover. Jett 2026-11-16.
//
// They are ordinary composite packages in DeliverDesk, named "Complete Queen Bed ·
// …" / "Complete King Bed · …" with SKUs ending -COMPLETE, so no backend flag is
// needed: fetch by search and keep only exact matches. An unpublished bundle never
// comes back from /storefront/packages, so every surface here is empty (and renders
// nothing) until DeliverDesk publishes one.
//
// The in-store bed sign's QR lands on /deals#beds, so the anchor id is a contract
// with a printed sign: keep BED_DEALS_ANCHOR stable.

import { fetchPackages, type StorefrontPackage } from './packages';

export const BED_DEALS_ANCHOR = 'beds';

const NAME = /^Complete (Queen|King) Bed\b/;

export function isCompleteBed(p: Pick<StorefrontPackage, 'name' | 'sku'>): boolean {
  return NAME.test(p.name || '') && /-COMPLETE$/i.test(p.sku || '');
}

export function splitBySize(pkgs: StorefrontPackage[]): { queen: StorefrontPackage[]; king: StorefrontPackage[] } {
  const beds = pkgs.filter(isCompleteBed).sort((a, b) => a.name.localeCompare(b.name));
  return {
    queen: beds.filter(p => NAME.exec(p.name)?.[1] === 'Queen'),
    king: beds.filter(p => NAME.exec(p.name)?.[1] === 'King'),
  };
}

export async function fetchCompleteBeds(): Promise<{ queen: StorefrontPackage[]; king: StorefrontPackage[] }> {
  try {
    return splitBySize(await fetchPackages({ search: 'complete', limit: 50 }));
  } catch {
    return { queen: [], king: [] };
  }
}

// ── Radio scavenger hunt, Saturday 2026-11-21 ────────────────────────────────
// Clue 2 sends players to scan the bed sign; this section shows them the vault
// PIN, but only during the hunt. Server-rendered and time-gated so the PIN is not
// in any page (or bundle) before the window opens. 12:00–16:00 America/Chicago;
// Nov 21 is CST (UTC-6). Delete after the event.
const HUNT_PIN = 'SNOOZE';
const HUNT_OPENS = Date.UTC(2026, 10, 21, 18, 0, 0);   // 12:00 CST
const HUNT_CLOSES = Date.UTC(2026, 10, 21, 22, 0, 0);  // 16:00 CST

export function huntPin(now: Date = new Date()): string | null {
  const t = now.getTime();
  return t >= HUNT_OPENS && t < HUNT_CLOSES ? HUNT_PIN : null;
}
