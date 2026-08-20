import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { catalogAuth } from './api';

// The shared-secret gate on the four server-only catalog reads (2026-08-20),
// answering the 2026-08-19 proxy-rotating scrape that OOM-crashed the backend
// and took the in-store app down with it.
//
// The tests that matter here are the ones that stop this from becoming the
// vulnerability it exists to close: the secret must never be reachable from the
// browser, and it must never be attached to an endpoint the browser calls.

describe('catalogAuth', () => {
  const OLD = process.env.STOREFRONT_SHARED_SECRET;
  beforeEach(() => { delete process.env.STOREFRONT_SHARED_SECRET; vi.unstubAllGlobals(); });
  afterEach(() => {
    if (OLD === undefined) delete process.env.STOREFRONT_SHARED_SECRET;
    else process.env.STOREFRONT_SHARED_SECRET = OLD;
    vi.unstubAllGlobals();
  });

  it('sends the header when the secret is configured server-side', () => {
    process.env.STOREFRONT_SHARED_SECRET = 'sk-abc';
    expect(catalogAuth()).toEqual({ 'x-storefront-key': 'sk-abc' });
  });

  it('sends NOTHING when the secret is unset', () => {
    // Must degrade to an unsigned request, not throw. The backend fails open on
    // an unconfigured secret, so an unset var during rollout is a working site.
    expect(catalogAuth()).toEqual({});
  });

  it('sends NOTHING in a browser context even if a value is somehow present', () => {
    // Belt and braces on top of Next's build-time rule. If this ever returns a
    // header client-side, the secret is in the wild.
    process.env.STOREFRONT_SHARED_SECRET = 'sk-abc';
    vi.stubGlobal('window', {});
    expect(catalogAuth()).toEqual({});
  });
});

// ── Source-level guards ─────────────────────────────────────────────────────
// These assert on the code rather than behaviour, because the failure modes
// they cover cannot be observed at runtime in a unit test — they only show up
// in a production bundle or on a live page.

const SRC = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}
const FILES = walk(SRC);

describe('the secret can never reach the browser bundle', () => {
  it('is never referenced through a NEXT_PUBLIC_ name', () => {
    // Next INLINES every NEXT_PUBLIC_* variable into the client JS at build
    // time. Renaming this var to NEXT_PUBLIC_* — an easy "fix" when a call
    // returns 403 — would publish the key to the scraper it exists to stop,
    // and nothing would appear broken.
    const bad = FILES.filter(f =>
      /NEXT_PUBLIC_[A-Z_]*(SHARED_SECRET|STOREFRONT_KEY|CATALOG_KEY)/.test(readFileSync(f, 'utf8')));
    expect(bad, 'the catalog secret must NOT be a NEXT_PUBLIC_ variable').toEqual([]);
  });

  it('is read in exactly one place', () => {
    // One reader means one guard. A second raw read is how the typeof-window
    // check gets skipped.
    const readers = FILES.filter(f =>
      /process\.env\.STOREFRONT_SHARED_SECRET/.test(readFileSync(f, 'utf8')));
    expect(readers.map(f => f.replace(SRC, '').replace(/\\/g, '/')))
      .toEqual(['/lib/api.ts']);
  });

  it('is never referenced from a client component', () => {
    const bad = FILES.filter(f => {
      const src = readFileSync(f, 'utf8');
      return /^\s*['"]use client['"]/m.test(src) &&
        /catalogAuth|STOREFRONT_SHARED_SECRET|x-storefront-key/.test(src);
    });
    expect(bad, "a 'use client' file references the catalog secret").toEqual([]);
  });
});

describe('the gate is only attached to endpoints the browser never calls', () => {
  it('is not attached to any browser-called endpoint', () => {
    // SectionalWizard.tsx is 'use client' and calls /storefront/sectional-families
    // directly; check-availability, subscribe, track-order and lead capture are
    // likewise called from client components. Signing any of them either breaks
    // the page or forces a NEXT_PUBLIC_ secret. Both outcomes are worse than
    // leaving those endpoints open, which is the decision on record.
    const FORBIDDEN = [
      'sectional-families', 'check-availability', 'subscribe', 'track-order', 'leads',
    ];
    // Strip comments first. The rule above is DOCUMENTED next to catalogAuth()
    // in lib/api.ts, and that prose names every forbidden path — so a scanner
    // that reads comments flags the very explanation of why it exists. (Same
    // trap the backend's boot contract test hit twice.)
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    const offenders: string[] = [];
    for (const f of FILES) {
      const code = stripComments(readFileSync(f, 'utf8'));
      // A fetch block mentioning both a forbidden path and catalogAuth is the
      // real risk; check proximity rather than whole-file co-occurrence.
      for (const path of FORBIDDEN) {
        const re = new RegExp(`${path}[\\s\\S]{0,300}catalogAuth\\(\\)`);
        if (re.test(code)) offenders.push(`${f}: catalogAuth() near "${path}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
