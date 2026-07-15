import { api, type Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { BEST_SELLER_IDS } from "@/lib/bestSellers";
import { FEATURED_IDS } from "@/lib/featured";
import Link from "next/link";

// Best-sellers spotlight — a swipeable rail of the top-selling in-stock pieces,
// ranked from real sales data (see DeliverDeskBackEnd/_best-sellers.js). Server
// component: fetches each by id at build/revalidate time, preserves rank order,
// and drops any that have since sold out / lost their photo. Fails quietly so a
// backend hiccup never breaks the homepage.
export default async function ProductCarousel() {
  // Curated features first, then sales-ranked best-sellers; dedupe by id so a
  // featured product that's also a best-seller only appears once.
  const ids = [...new Set([...FEATURED_IDS, ...BEST_SELLER_IDS])];
  const results = await Promise.all(
    ids.map((id) => api.getProduct(id).catch(() => null)),
  );
  const items = results
    .filter((p): p is Product => !!p && !!p.image_url && !!p.in_stock)
    .slice(0, 12);
  if (items.length === 0) return null;

  return (
    <section className="bg-white border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-charcoal">Best sellers — in stock now</h2>
            <p className="text-brand-charcoal-light mt-1 text-sm">
              Our most-loved pieces, ready to deliver. Swipe to browse.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-brand-green font-semibold text-sm hover:underline whitespace-nowrap hidden sm:inline"
          >
            Shop all →
          </Link>
        </div>

        {/* Horizontal scroll-snap rail — no JS; swipe on touch, scroll on
            desktop. Negative margin bleeds cards to the screen edge on mobile
            so the last card hints there's more. */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {items.map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-52 sm:w-60">
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        <Link href="/shop" className="text-brand-green font-semibold text-sm hover:underline sm:hidden">
          Shop all →
        </Link>
      </div>
    </section>
  );
}
