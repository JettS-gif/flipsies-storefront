// How many results a shopper can actually SEE for their search.
//
// The shop grid holds products. It deliberately does NOT hold sectional pieces —
// they collapse into one "Build yours" family card — and it does not hold
// packages either. So the server's product count is not the number of results on
// the screen, and using it as one produced the sharpest bug in this area: a
// search for "turner" rendered the Turner Sectional card directly beneath the
// words "0 products found" (measured 2026-09-19).
//
// That miscount is used in TWO places — the header line the shopper reads, and
// the results_count recorded with the search event — so it lives here rather
// than being written out twice. Those two had to agree and there was nothing
// making them: the whole unmet-demand panel is built on the recorded number, and
// searchSynonyms.js is curated from that table, so a count that says "we do not
// carry it" about a sectional on the floor feeds back into the synonym map.
// 13 terms and 19 visitors read that way between 2026-08-01 and 2026-09-19.
//
// COLLECTION CARDS ARE EXCLUDED ON PURPOSE. They are collapsed FROM the same
// products the product count already counts, so adding them double-counts. They
// also only exist on a room browse (`roomBrowse` is false whenever there is a
// search), which is the branch that shows the plain product total anyway. If you
// are tempted to add them, that is the bug this comment exists to prevent.
export function shownResultCount(
  productCount: number,
  familyCount: number,
  packageCount: number,
): number {
  return (productCount || 0) + (familyCount || 0) + (packageCount || 0);
}
