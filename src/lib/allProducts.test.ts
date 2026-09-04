import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PAGE_SIZE } from './allProducts';

// Contract: every surface that publishes the catalogue walks ALL of it.
//
// ── What happened ───────────────────────────────────────────────────────────
//
// Four routes each carried their own paging loop, and all four ended it the
// same wrong way:
//
//     const PAGE = 200;
//     const { data } = await api.getProducts({ limit: PAGE, offset });
//     if (data.length < PAGE) break;
//
// That holds only while the server honours the page size you ask for. On
// 2026-08-19 the backend added STOREFRONT_MAX_LIMIT = 100 — a good change, made
// because `limit` flowed straight into .range() and one request could drag the
// whole catalogue. From that moment every loop asked for 200, got 100, read
// 100 < 200 as "last page", and stopped after one.
//
// Measured 2026-09-04 against 3,020 published products:
//   /feed/chatgpt.txt  94 rows  (the backlog had recorded 2,478)
//   /feed/google.txt   94 rows
//   /feed/local.txt    39 rows
//   sitemap.xml        94 product URLs
//
// Two and a half weeks of Google, Bing and every shopping surface seeing ~3% of
// the catalogue, with no error anywhere. Both sides were reasonable on their
// own; the CONTRACT between them was the page-size assumption, and nothing
// tested it. Hence this file.

const SRC = join(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('catalogue paging', () => {
  it('pages at the size the server will actually honour', () => {
    // If the backend cap moves, this is the one number to change. Asking for
    // more than the cap is not itself a bug now that termination is correct,
    // but a matching size means no request comes back clamped.
    expect(PAGE_SIZE).toBe(100);
  });

  it('no file terminates a catalogue walk on a short page', () => {
    // The precise shape that broke: comparing a returned page's length against
    // the size we REQUESTED. An empty page is the only signal a server cannot
    // silently redefine.
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      // COMMENTS STRIPPED FIRST. The rule is about code, and allProducts.ts
      // quotes the broken pattern in its own header to explain it — scanning
      // raw text flags the explanation and, worse, the obvious "fix" is to
      // exclude that file, which would then hide a real offence there.
      // (memory: deliverdesk-source-scan-tests-hit-comments)
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      // e.g. `data.length < PAGE`, `rows.length < limit`, `page.length < SIZE`
      const m = code.match(/\.length\s*<\s*(PAGE|PAGE_SIZE|limit|LIMIT|SIZE)\b/);
      if (m) offenders.push(`${file.replace(SRC, 'src')} → "${m[0]}"`);
    }
    expect(offenders,
      'A short page does not mean the end of the catalogue — the server clamps '
      + 'limit to STOREFRONT_MAX_LIMIT, so a request for more comes back short on '
      + 'EVERY page. Use fetchAllProducts() from @/lib/allProducts, which stops '
      + 'on an empty page instead.',
    ).toEqual([]);
  });

  it('every catalogue publisher goes through the shared walker', () => {
    // These four are the product-discovery surface of the business. If one grows
    // its own loop again it will re-acquire the bug the moment a limit changes.
    const publishers = [
      'app/feed/chatgpt.txt/route.ts',
      'app/feed/google.txt/route.ts',
      'app/feed/local.txt/route.ts',
      'app/sitemap.ts',
    ];
    for (const rel of publishers) {
      const text = readFileSync(join(SRC, rel), 'utf8');
      expect(text, `${rel} must page via fetchAllProducts`).toContain('fetchAllProducts');
      expect(text, `${rel} must not call getProducts directly`).not.toMatch(/api\.getProducts\(/);
    }
  });
});
