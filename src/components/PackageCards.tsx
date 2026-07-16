import Link from 'next/link';
import type { StorefrontPackage } from '@/lib/packages';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Package cards for the shop grid — one "Akerson 5PC Bedroom Set" tile per
// collection instead of five near-identical piece tiles (bed, dresser, mirror,
// nightstand, chest). Same merchandising play as SectionalFamilyCards.
//
// The collection badge is the drill-in: it routes to the flat piece list for
// that collection, so a shopper who wants just the chest can still get there.
export default function PackageCards({
  packages,
  title = 'Complete the room — save on the set',
}: {
  packages: StorefrontPackage[];
  title?: string;
}) {
  if (packages.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-charcoal">{title}</h2>
          <p className="text-sm text-brand-charcoal-light mt-0.5">
            Buy the whole set for less than the pieces separately.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {packages.map((p) => {
          const hero = p.images?.[0] || p.items.find((i) => i.images?.length)?.images?.[0] || null;
          return (
            <div
              key={p.id}
              className="group relative bg-white rounded-xl border border-brand-border overflow-hidden hover:shadow-lg hover:border-brand-yellow transition-all"
            >
              <Link href={`/package/${p.id}`} className="block">
                <div className="relative aspect-[4/3] bg-brand-warm-gray flex items-center justify-center overflow-hidden">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl opacity-30">🛏</span>
                  )}
                  {p.savings > 0 && (
                    <span className="absolute top-2 left-2 bg-brand-yellow text-brand-charcoal text-[11px] font-bold px-2 py-1 rounded-full shadow-sm">
                      Save {money(p.savings)}
                    </span>
                  )}
                  {!p.in_stock && (
                    <span className="absolute bottom-2 left-2 bg-white/90 text-brand-charcoal-light text-[11px] font-semibold px-2 py-1 rounded-full">
                      Special order
                    </span>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/package/${p.id}`} className="block">
                  <h3 className="text-sm font-semibold text-brand-charcoal group-hover:text-brand-yellow-dark transition-colors line-clamp-2">
                    {p.name}
                  </h3>
                </Link>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-base font-bold text-brand-charcoal">{money(p.price)}</span>
                  {p.compare_at_price > p.price && (
                    <span className="text-xs text-brand-charcoal-light line-through">{money(p.compare_at_price)}</span>
                  )}
                </div>
                <p className="text-xs text-brand-charcoal-light mt-1">{p.item_count} pieces</p>
                {/* The badge doubles as the drill-in to the individual pieces —
                    a shopper who only wants the chest starts here. */}
                {p.collection && (
                  <Link
                    href={`/shop?collection=${encodeURIComponent(p.collection)}`}
                    className="inline-block mt-2 text-[11px] font-semibold text-brand-green border border-brand-green/30 bg-brand-green/5 px-2 py-0.5 rounded-full hover:bg-brand-green/10 transition-colors"
                  >
                    {p.collection} — shop pieces
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
