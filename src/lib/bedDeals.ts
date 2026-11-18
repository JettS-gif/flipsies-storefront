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
// Base bundle "UBF-23GYQ-COMPLETE"; mattress-ladder steps add a code: "…-COMPLETE-D10".
const SKU = /^(.*)-COMPLETE(?:-[A-Z0-9]+)?$/i;

export function isCompleteBed(p: Pick<StorefrontPackage, 'name' | 'sku'>): boolean {
  return NAME.test(p.name || '') && SKU.test(p.sku || '');
}

/** Bundles for the same bed share this key; one key = one mattress ladder. */
export function bedKey(p: Pick<StorefrontPackage, 'sku'>): string {
  return SKU.exec(p.sku || '')?.[1]?.toUpperCase() || '';
}

/** The mattress step's label, from the last name segment: "… · Dreamer 10\" Mattress". */
export function mattressLabel(p: Pick<StorefrontPackage, 'name'>): string {
  const parts = (p.name || '').split(' · ');
  return parts.length > 3 ? parts[parts.length - 1] : 'Mattress';
}

/** Every step of `pkg`'s ladder (itself included), cheapest first. */
export function ladderFor(pkg: StorefrontPackage, all: StorefrontPackage[]): StorefrontPackage[] {
  const key = bedKey(pkg);
  return all
    .filter(p => isCompleteBed(p) && bedKey(p) === key)
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

/**
 * One card per bed (its cheapest bundle) so Deals and the home page show "from"
 * prices instead of every mattress step; the bundle page offers the rest.
 */
export function splitBySize(pkgs: StorefrontPackage[]): { queen: StorefrontPackage[]; king: StorefrontPackage[] } {
  const base = new Map<string, StorefrontPackage>();
  for (const p of pkgs.filter(isCompleteBed)) {
    const k = bedKey(p);
    const cur = base.get(k);
    if (!cur || p.price < cur.price) base.set(k, p);
  }
  const beds = [...base.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    queen: beds.filter(p => NAME.exec(p.name)?.[1] === 'Queen'),
    king: beds.filter(p => NAME.exec(p.name)?.[1] === 'King'),
  };
}

async function fetchAllCompleteBeds(): Promise<StorefrontPackage[]> {
  return (await fetchPackages({ search: 'complete', limit: 100 })).filter(isCompleteBed);
}

export async function fetchCompleteBeds(): Promise<{ queen: StorefrontPackage[]; king: StorefrontPackage[] }> {
  try {
    return splitBySize(await fetchAllCompleteBeds());
  } catch {
    return { queen: [], king: [] };
  }
}

/** The published ladder for a bundle page; empty when the bundle isn't a complete bed. */
export async function fetchLadder(pkg: StorefrontPackage): Promise<StorefrontPackage[]> {
  if (!isCompleteBed(pkg)) return [];
  try {
    return ladderFor(pkg, await fetchAllCompleteBeds());
  } catch {
    return [];
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

// Sign-up stays open until the hunt closes, so the home-page banner runs until then.
export function huntIsOpen(now: Date = new Date()): boolean {
  return now.getTime() < HUNT_CLOSES;
}
