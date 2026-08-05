import Link from 'next/link';

// Server-rendered <a> links, deliberately — not a "load more" button.
//
// Before this existed, category pages requested 48 products and stopped: 18
// categories exceeded the cap and 640 products (28% of the catalog) could not
// be reached by browsing at all. A shopper could not get to them, and Google
// reached those PDPs only through the sitemap, so they collected almost no
// internal link equity no matter how good their titles were. A JS-only
// load-more would have fixed the first problem and not the second.
//
// No rel="next"/rel="prev": Google retired those as an indexing signal in 2019
// and now asks for exactly this — ordinary crawlable links between the pages.

function windowed(page: number, total: number): (number | 'gap')[] {
  const keep = new Set<number>([1, total, page]);
  for (let d = 1; d <= 2; d++) {
    if (page - d > 0) keep.add(page - d);
    if (page + d <= total) keep.add(page + d);
  }
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

export default function Pagination({
  page,
  total,
  hrefFor,
}: {
  page: number;
  /** Total number of pages, not the number of products. */
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (total <= 1) return null;

  const box =
    'min-w-10 h-10 px-3 inline-flex items-center justify-center rounded-lg border text-sm transition-colors';
  const idle = 'border-brand-border text-brand-charcoal-light hover:border-brand-yellow hover:text-brand-charcoal';
  const off = 'border-brand-border/60 text-brand-charcoal-light/40 cursor-default';

  return (
    <nav className="mt-10 flex items-center justify-center gap-2 flex-wrap" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${box} ${idle}`}>
          Previous
        </Link>
      ) : (
        <span className={`${box} ${off}`} aria-hidden="true">Previous</span>
      )}

      {windowed(page, total).map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-brand-charcoal-light/60">…</span>
        ) : n === page ? (
          <span key={n} className={`${box} border-brand-charcoal bg-brand-charcoal text-white font-medium`} aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} href={hrefFor(n)} className={`${box} ${idle}`}>
            {n}
          </Link>
        ),
      )}

      {page < total ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${box} ${idle}`}>
          Next
        </Link>
      ) : (
        <span className={`${box} ${off}`} aria-hidden="true">Next</span>
      )}
    </nav>
  );
}
