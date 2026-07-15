import { api, type Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

// "More from this collection" rail on the PDP — cross-sells the matching
// pieces of a suite (viewing a Brookhaven chest → the dresser, nightstand,
// bed, etc.). Dedupes to one card per piece-type (category) so color/finish
// variants of the same piece don't flood the rail, preferring photographed +
// in-stock. Server component; fails quietly. Includes special-order pieces so
// a shopper can order the whole matching set even if a piece isn't in stock.
export default async function RelatedProducts({
  collection,
  excludeId,
}: {
  collection: string | null;
  excludeId: string;
}) {
  if (!collection) return null;

  let data: Product[] = [];
  try {
    const res = await api.getProducts({ collection, limit: 48 });
    data = res.data;
  } catch {
    return null;
  }

  const seen = new Set<string>();
  const items = data
    .filter((p) => p.id !== excludeId)
    .sort(
      (a, b) =>
        Number(!!b.image_url) - Number(!!a.image_url) ||
        Number(!!b.in_stock) - Number(!!a.in_stock) ||
        (a.name || "").localeCompare(b.name || ""),
    )
    .filter((p) => {
      const key = (p.category || p.type || p.id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);

  if (items.length === 0) return null;

  return (
    <section className="mt-14 lg:mt-20 border-t border-brand-border pt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-brand-charcoal">
          More from the {collection} collection
        </h2>
        <p className="text-brand-charcoal-light mt-1 text-sm">
          Complete the look — matching pieces you can order together.
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
