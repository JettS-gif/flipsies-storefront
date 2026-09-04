import { api, type Product } from '@/lib/api';

// One correct way to walk the whole catalogue.
//
// ── The bug this exists to kill ─────────────────────────────────────────────
//
// Four surfaces each carried their own copy of this loop — the ChatGPT feed,
// the Google feed, the local-inventory feed and sitemap.ts — and every copy
// terminated the same wrong way:
//
//     const PAGE = 200;
//     const { data } = await api.getProducts({ limit: PAGE, offset });
//     if (data.length < PAGE) break;          // "a short page means the end"
//
// That is only true while the server honours the page size you asked for. On
// 2026-08-19 the backend added STOREFRONT_MAX_LIMIT = 100 (server.js:177) for a
// perfectly good reason — `limit` went straight from the query string into
// .range(), so one request could drag the entire catalogue. From that moment
// every one of these loops asked for 200, received 100, read 100 < 200 as
// "that was the last page", and stopped after ONE page.
//
// Measured 2026-09-04, against 3,020 published products:
//
//     /feed/chatgpt.txt      94 rows      (backlog recorded 2,478)
//     /feed/google.txt       94 rows
//     /feed/local.txt        39 rows
//     sitemap.xml            94 product URLs
//
// So for roughly two and a half weeks Google, Bing and every shopping surface
// could see about 3% of the catalogue, and nothing anywhere reported an error.
// Both sides were individually reasonable; the CONTRACT between them was the
// page-size assumption, and nothing tested it.
//
// ── Why it terminates on an empty page ──────────────────────────────────────
//
// Not on `data.length < PAGE`, which is the bug. Not on the response `count`
// either: server.js:839 asks Postgres for an ESTIMATED count on this path
// (only the collapsed view is exact), and pacing a loop off an estimate either
// stops early or runs long. An empty page is the one signal that cannot lie,
// and it costs exactly one extra request per walk.
//
// PAGE_SIZE matches the server cap so each request is full rather than clamped.
// If the cap ever changes, this still terminates correctly — it just does more
// or fewer round trips.

/** Matches STOREFRONT_MAX_LIMIT in the backend (server.js). */
const PAGE_SIZE = 100;

/** Absolute ceiling, so a paging fault cannot become an unbounded loop. */
const MAX_PRODUCTS = 50000;

/**
 * Every product the storefront catalogue will serve.
 *
 * @param params extra query params — e.g. `{ include_never_stock: 1 }` for the
 *   feeds, which publish special-order items the browse grid deliberately hides.
 */
export async function fetchAllProducts(
  params: Record<string, string | number> = {},
): Promise<Product[]> {
  const out: Product[] = [];
  let offset = 0;

  for (;;) {
    const { data } = await api.getProducts({ ...params, limit: PAGE_SIZE, offset });
    const page = (data || []) as Product[];
    out.push(...page);

    // The only safe terminator: the server gave us nothing back.
    if (page.length === 0) break;
    if (out.length >= MAX_PRODUCTS) break;

    offset += page.length;   // advance by what we RECEIVED, never by what we asked for
  }

  return out;
}

export { PAGE_SIZE, MAX_PRODUCTS };
