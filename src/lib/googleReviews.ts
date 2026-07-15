import { SHOWROOMS } from '@/lib/site';

// Live Google reviews via the Places API (Place Details). Server-side only —
// the key never reaches the browser. Cached ~daily so it's fast and costs
// pennies. Aggregates both showrooms into one rating + total, and collects the
// best recent reviews for the on-site cards. Returns null (section hides) when
// the key/place IDs are missing or Google errors — never breaks the page.

const KEY = process.env.GOOGLE_PLACES_API_KEY || '';

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  relativeTime?: string;
}
export interface GoogleReviewData {
  rating: number; // aggregate, weighted by each showroom's review count
  count: number;  // total across showrooms
  reviews: GoogleReview[];
}

interface PlaceResult {
  rating?: number;
  user_ratings_total?: number;
  reviews?: Array<{
    author_name?: string;
    rating?: number;
    text?: string;
    relative_time_description?: string;
  }>;
}

async function fetchPlace(placeId: string): Promise<PlaceResult | null> {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=rating,user_ratings_total,reviews&key=${KEY}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'OK') {
      console.warn('[googleReviews] Places API status:', json.status, json.error_message || '');
      return null;
    }
    return json.result as PlaceResult;
  } catch (e) {
    console.warn('[googleReviews] fetch failed:', (e as Error).message);
    return null;
  }
}

export async function getGoogleReviews(): Promise<GoogleReviewData | null> {
  if (!KEY) return null;
  const placeIds = SHOWROOMS.map((s) => s.placeId).filter(Boolean);
  if (placeIds.length === 0) return null;

  const results = (await Promise.all(placeIds.map(fetchPlace))).filter(Boolean) as PlaceResult[];
  if (results.length === 0) return null;

  let count = 0;
  let weighted = 0;
  const all: GoogleReview[] = [];
  for (const r of results) {
    const c = Number(r.user_ratings_total || 0);
    count += c;
    weighted += Number(r.rating || 0) * c;
    for (const rv of r.reviews || []) {
      if (rv.text && rv.author_name && typeof rv.rating === 'number') {
        all.push({
          author: rv.author_name,
          rating: rv.rating,
          text: rv.text,
          relativeTime: rv.relative_time_description,
        });
      }
    }
  }
  if (count === 0) return null;

  const reviews = all
    .filter((rv) => rv.rating >= 4 && rv.text.length > 20)
    .sort((a, b) => b.rating - a.rating || b.text.length - a.text.length)
    .slice(0, 9);

  return { rating: Math.round((weighted / count) * 10) / 10, count, reviews };
}
