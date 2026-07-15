import { getGoogleReviews } from '@/lib/googleReviews';
import { SHOWROOMS } from '@/lib/site';

// Five stars with the first `n` filled. Decorative — the numeric rating + count
// carry the meaning for screen readers.
function Stars({ n = 5 }: { n?: number }) {
  const filled = Math.round(n);
  return (
    <span aria-hidden="true" className="tracking-tight">
      <span className="text-brand-yellow">{'★★★★★'.slice(0, filled)}</span>
      <span className="text-brand-border">{'★★★★★'.slice(filled)}</span>
    </span>
  );
}

// Live Google-reviews social proof. Server component: pulls the aggregate
// rating + count + real reviews from the Places API. Renders nothing until the
// Places API key is configured, so it's safe to leave on the page.
export default async function Reviews() {
  const data = await getGoogleReviews();
  if (!data || data.count === 0) return null;

  const { rating, count, reviews } = data;
  const readAll = `https://search.google.com/local/reviews?placeid=${SHOWROOMS[0]?.placeId ?? ''}`;

  return (
    <section className="bg-brand-warm-gray border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-brand-charcoal">
            Rated {rating.toFixed(1)} by our Birmingham neighbors
          </h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-2xl leading-none">
              <Stars n={rating} />
            </span>
            <span className="text-lg font-semibold text-brand-charcoal">{rating.toFixed(1)}</span>
            <span className="text-brand-charcoal-light">· {count.toLocaleString()} Google reviews</span>
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {reviews.slice(0, 6).map((r, i) => (
              <figure key={i} className="bg-white rounded-xl border border-brand-border p-6 lg:p-7 flex flex-col">
                <div className="text-lg leading-none mb-3">
                  <Stars n={r.rating} />
                </div>
                <blockquote className="text-sm text-brand-charcoal leading-relaxed flex-1 line-clamp-6">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-brand-charcoal">
                  {r.author}
                  {r.relativeTime && (
                    <span className="font-normal text-brand-charcoal-light"> · {r.relativeTime}</span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <a href={readAll} target="_blank" rel="noopener noreferrer" className="btn-outline">
            Read all our reviews on Google
          </a>
        </div>
      </div>
    </section>
  );
}
