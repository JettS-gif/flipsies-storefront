import { api, type Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { BEST_SELLER_IDS } from "@/lib/bestSellers";

// How many proven winners lead the rail before it switches to price-matched
// alternatives. Small on purpose — see the ordering note below.
const TOP_SELLER_SLOTS = 3;

// "Other popular <category>" rail — the comparison rail, sibling to
// RelatedProducts (which coordinates within one suite + fabric).
//
// Why both: a PDP visitor is usually mid-decision, not post-decision. Cold ad
// traffic lands on a sofa asking "is this the right sofa?", and a
// same-suite-only rail gives that shopper nowhere to go but back. This rail
// answers the comparison question; RelatedProducts answers the coordinate one.
//
// Ordering: the top 3 sellers in this category first (ranked on real units sold
// via BEST_SELLER_IDS), THEN the closest matches on price. Rationale — leading
// with best-sellers alone surfaced $949–$1699 sofas under a $649 one, because
// our winners skew expensive; a shopper looking at $649 mostly wants to know
// what else $649 buys. Three slots is the cap on purpose: best-sellers on a PDP
// cannibalize the item being viewed if you let them run, trading a likely sale
// for a maybe. Three reads as "here's what's proven", not "ignore what you're
// looking at".
//
// Excludes the suite being viewed — those pieces are already in the rail above.
// Reads the collapsed grid so each model appears once, not once per colorway.
// Server component; fails quietly.
export default async function SimilarProducts({
  category,
  price,
  excludeCollection,
  excludeId,
}: {
  category: string | null;
  price: number | null;
  excludeCollection: string | null;
  excludeId: string;
}) {
  if (!category) return null;

  let data: Product[] = [];
  try {
    const res = await api.getProducts({ category, limit: 48 });
    data = res.data;
  } catch {
    return null;
  }

  const pool = data
    .filter((p) => p.id !== excludeId)
    .filter((p) => !excludeCollection || p.collection !== excludeCollection)
    .filter((p) => !!p.image_url);

  // One card per collection. The grid view collapses variant groups, but a
  // collection whose colorways were never grouped still arrives as several
  // near-identical tiles (three $949.97 Barretts). Three of the same sofa isn't
  // a comparison, so keep the first — which, given the ordering below, is the
  // best-ranked or closest-priced member of that collection.
  const oneOf = (list: Product[]) => {
    const seen = new Set<string>();
    return list.filter((p) => {
      const key = (p.collection || p.id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const sellerRank = (p: Product) => {
    const i = BEST_SELLER_IDS.indexOf(p.id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const topSellers = oneOf(
    pool
      .filter((p) => sellerRank(p) !== Number.MAX_SAFE_INTEGER)
      .sort((a, b) => sellerRank(a) - sellerRank(b)),
  ).slice(0, TOP_SELLER_SLOTS);

  // Collections, not ids — a top-seller's sibling colorway must not reappear
  // further down the rail as a "price match".
  const chosen = new Set(topSellers.map((p) => (p.collection || p.id).toLowerCase()));

  // Closest on price fills the rest. Without a reference price (shouldn't
  // happen, but the field is nullable) fall back to in-stock + alphabetical so
  // the rail still renders something sane rather than an arbitrary order.
  const priceMatched = oneOf(
    pool
      .filter((p) => !chosen.has((p.collection || p.id).toLowerCase()))
      .sort((a, b) => {
        if (price != null) {
          const da = Math.abs(Number(a.retail_price) - price);
          const db = Math.abs(Number(b.retail_price) - price);
          if (da !== db) return da - db;
        }
        return (
          Number(!!b.in_stock) - Number(!!a.in_stock) ||
          (a.name || "").localeCompare(b.name || "")
        );
      }),
  );

  const items = [...topSellers, ...priceMatched].slice(0, 12);

  // One card is a dead-end, not a rail — the comparison only reads as a choice
  // once there are a few to weigh against each other.
  if (items.length < 2) return null;

  return (
    <section className="mt-12 border-t border-brand-border pt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-brand-charcoal">
          Other popular {category.toLowerCase()}s
        </h2>
        <p className="text-brand-charcoal-light mt-1 text-sm">
          Our best sellers, then more around this price — swipe to compare.
        </p>
      </div>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.map((p) => (
          <div key={p.id} className="snap-start shrink-0 w-52 sm:w-60">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
