import { api, type Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { BEST_SELLER_IDS } from "@/lib/bestSellers";

// "Other popular <category>" rail — the comparison rail, sibling to
// RelatedProducts (which coordinates within one suite + fabric).
//
// Why both: a PDP visitor is usually mid-decision, not post-decision. Cold ad
// traffic lands on a sofa asking "is this the right sofa?", and a
// same-suite-only rail gives that shopper nowhere to go but back. This rail
// answers the comparison question; RelatedProducts answers the coordinate one.
//
// Ranked by real units sold (BEST_SELLER_IDS, generated from live sales), then
// in-stock, then photographed. Excludes the suite being viewed — those pieces
// are already in the rail above. Reads the collapsed grid so each model appears
// once rather than once per colorway. Server component; fails quietly.
export default async function SimilarProducts({
  category,
  excludeCollection,
  excludeId,
}: {
  category: string | null;
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

  const rank = (p: Product) => {
    const i = BEST_SELLER_IDS.indexOf(p.id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const items = data
    .filter((p) => p.id !== excludeId)
    .filter((p) => !excludeCollection || p.collection !== excludeCollection)
    .filter((p) => !!p.image_url)
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        Number(!!b.in_stock) - Number(!!a.in_stock) ||
        (a.name || "").localeCompare(b.name || ""),
    )
    .slice(0, 12);

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
          Our best-selling {category.toLowerCase()}s — swipe to compare.
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
