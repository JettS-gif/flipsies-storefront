// Owned Google-reviews feature. Google's Places API caps at 5 reviews, so
// featuring your few-hundred-review volume is done by curating exported
// reviews here + showing the aggregate, with a link out to Google — no
// external widget, no monthly fee, full control.
//
// ── BEFORE LAUNCH (jett) ──────────────────────────────────────────────
//   1. Set REVIEW_STATS to your real current average + total review count.
//   2. Replace the placeholder FEATURED_REVIEWS with real reviews (first
//      name + last initial, rating, the quote, which showroom). The entries
//      below are OBVIOUS placeholders for layout only — do NOT ship them.
//   3. Confirm the "read all" links resolve to your Google listings.

export interface Review {
  author: string;                       // "Sarah M."
  rating: number;                       // 1–5
  text: string;
  showroom?: "Hoover" | "Irondale";
  date?: string;                        // "May 2026"
}

// Aggregate across both showrooms. PLACEHOLDER — confirm the live numbers.
export const REVIEW_STATS = {
  rating: 4.8,   // TODO(jett): real average
  count: 300,    // TODO(jett): real total review count
};

// Google review links per showroom (the CIDs come from the DeliverDesk
// review-email helper). `write` opens the leave-a-review dialog; `read`
// opens the listing so visitors can browse all reviews.
export const GOOGLE_REVIEWS = {
  Hoover: {
    write: "https://g.page/r/CYMG1-vnW3EWEAE/review",
    read:  "https://g.page/r/CYMG1-vnW3EWEAE",
  },
  Irondale: {
    write: "https://g.page/r/CVWL230IxOMOEAE/review",
    read:  "https://g.page/r/CVWL230IxOMOEAE",
  },
};

// Curated highlights shown on the homepage. PLACEHOLDERS — replace with real
// Google reviews before launch (see header). Empty this array to show the
// aggregate badge + link only.
export const FEATURED_REVIEWS: Review[] = [
  { author: "[PLACEHOLDER — replace]", rating: 5, text: "Paste a real Google review quote here (edit src/lib/reviews.ts).", showroom: "Hoover", date: "" },
  { author: "[PLACEHOLDER — replace]", rating: 5, text: "Paste a real Google review quote here (edit src/lib/reviews.ts).", showroom: "Irondale", date: "" },
  { author: "[PLACEHOLDER — replace]", rating: 5, text: "Paste a real Google review quote here (edit src/lib/reviews.ts).", showroom: "Hoover", date: "" },
];
