import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..');

/**
 * CST invariant scanner for the STOREFRONT.
 *
 * The storefront has TWO ways to get a date wrong, and they are different from
 * both other repos — which is why this rule is the strictest of the three:
 *
 *   SERVER components run on Vercel, in UTC. After 7pm CT the UTC date is
 *   already tomorrow.
 *   CLIENT components run in the SHOPPER's timezone — whatever they happen to
 *   be in. Two customers can compute different "today"s for the same rule.
 *
 * So unlike the staff app, a bare `new Date()` calendar read is NOT safe here:
 * there is no single timezone the code can assume. Both patterns fail.
 *
 * Both bugs this catches were live on 2026-07-31:
 *   computeMinPickupDate  — offered a Central shopper a minimum pickup date a
 *                           day later than the 48-hour rule requires, so valid
 *                           days were silently unavailable.
 *   deliverySlot.isSlotFresh — parsed a Central slot in the shopper's zone, so
 *                           a west-coast shopper validated the 48-hour lead
 *                           against a moment two hours off.
 *
 * Fix: helpers in src/lib/ct.ts — todayCT / monthCT / addDaysCT / weekdayCT.
 *
 * Ratchet: a file may go DOWN freely; up, or a new file, fails.
 */

const PATTERNS: Array<[string, RegExp]> = [
  // Converts local (server-UTC or shopper-local) to UTC, then slices. Always wrong.
  ['utc-slice',   /\.toISOString\(\)\s*\.\s*slice\(\s*0\s*,\s*(?:10|7)\s*\)/],
  // Reads the ambient calendar — undefined which one on this repo.
  ['calendar',    /\bnew Date\([^)]*\)\s*\.\s*(?:getDay|getDate|getMonth|getFullYear|getHours)\s*\(\)/],
  // Zone-less parse: server-UTC or shopper-local, never reliably Central.
  ['naive-parse', /new Date\(\s*[`'"][^`'"]*T00:00:00[`'"]\s*\)|new Date\(\s*`[^`]*T00:00:00`\s*\)/],
];

// Sanctioned: pins Central, uses the helper, noon-anchored, or explicitly marked.
const EXEMPT = /America\/Chicago|todayCT|monthCT|addDaysCT|weekdayCT|centralOffset|T12:00:00|tz-neutral|-0[56]:00/;

// ct.ts IS the machinery; deliverySlot.ts builds its own explicit CT offset.
const EXEMPT_FILE = /(^|\/)(ct\.ts)$|\.test\.ts$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|\.next|\.git/.test(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

function scan(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join('/');
    if (EXEMPT_FILE.test(rel)) continue;
    const raw = fs.readFileSync(file, 'utf8').split('\n');
    // Match patterns against comment-STRIPPED source (so a commented-out example
    // can't trip it), but look for the `tz-neutral` marker in the RAW lines —
    // stripping turns the marker itself into whitespace. Lookback of 3 lines so
    // the marker can sit above the statement, which is where it reads naturally.
    const code = stripComments(raw.join('\n')).split('\n');
    for (let i = 0; i < code.length; i++) {
      if (EXEMPT.test(code[i])) continue;
      if (!PATTERNS.some(([, re]) => re.test(code[i]))) continue;
      const window = raw.slice(Math.max(0, i - 3), i + 1).join('\n');
      if (/tz-neutral/i.test(window)) continue;
      counts[rel] = (counts[rel] || 0) + 1;
    }
  }
  return counts;
}

const LEGACY: Record<string, number> = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, 'ctInvariant.legacy.json'), 'utf8'),
);

describe('CST invariant — storefront', () => {
  it('no NEW ambient-timezone date derivations', () => {
    const found = scan();
    const problems: string[] = [];

    for (const [file, n] of Object.entries(found)) {
      const ceiling = LEGACY[file];
      if (ceiling === undefined) problems.push(`NEW  ${file} — ${n} site(s)`);
      else if (n > ceiling) problems.push(`OVER ${file}: ${n} > ${ceiling}`);
      else if (n < ceiling) problems.push(`DOWN ${file}: ${n} < ${ceiling} — lower it in ctInvariant.legacy.json`);
    }
    for (const [file, ceiling] of Object.entries(LEGACY)) {
      if (!found[file] && ceiling > 0) problems.push(`DOWN ${file}: 0 < ${ceiling} — remove it from ctInvariant.legacy.json`);
    }

    expect(problems, [
      '',
      'CST invariant violations (storefront).',
      'Server code runs UTC on Vercel; client code runs in the SHOPPER\'s zone.',
      'Neither is the store\'s calendar, so ambient date reads are unsafe here.',
      '',
      'Fix: todayCT / monthCT / addDaysCT / weekdayCT from src/lib/ct.ts',
      'Genuinely instant/elapsed math? Mark it `// tz-neutral: <why>`.',
      '',
      ...problems.map((p) => '  ' + p),
      '',
    ].join('\n')).toEqual([]);
  });

  it('the sanctioned helper is still TZ-pinned', () => {
    // Guard the escape hatch: if ct.ts stops pinning Central, every fix that
    // points at it silently becomes wrong.
    const ct = fs.readFileSync(path.join(SRC, 'lib', 'ct.ts'), 'utf8');
    expect(ct).toMatch(/America\/Chicago/);
    expect(ct.slice(ct.indexOf('export function todayCT'), ct.indexOf('export function monthCT')))
      .toMatch(/timeZone:\s*CT/);
  });
});
