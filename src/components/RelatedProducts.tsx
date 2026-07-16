import { api, type Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

// "Matching pieces in this fabric" rail — the coordinate/complete-the-look rail.
// Viewing a 1140 sofa in Grande Mist surfaces the Grande Mist loveseat, chair and
// sleeper: same suite (collection), same colorway.
//
// Matching on collection ALONE was wrong — a suite carries every fabric it's
// offered in (the 1140 series is 44 rows), so the rail mixed a Blair Cream sofa
// under a Grande Mist one. Passing `color` also forces the backend onto the base
// table: browse reads storefront_products_grid, whose DISTINCT ON picks one
// representative per variant group before filtering, which is exactly what hides
// the sibling fabrics we want here.
//
// Dedupes to one card per category so a suite doesn't show four near-identical
// sofas, preferring photographed + in-stock. Server component; fails quietly.
// Special-order pieces are included so a shopper can order the whole set.
export default async function RelatedProducts({
  collection,
  color,
  excludeId,
}: {
  collection: string | null;
  color: string | null;
  excludeId: string;
}) {
  if (!collection) return null;

  let data: Product[] = [];
  try {
    const res = await api.getProducts({
      collection,
      ...(color ? { color } : {}),
      limit: 48,
    });
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
          {color ? `Matching pieces in ${color}` : `More from ${collection}`}
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
