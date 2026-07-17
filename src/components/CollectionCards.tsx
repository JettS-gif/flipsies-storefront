import Link from 'next/link';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// One card per collection for a room browse — collapses a collection's separate
// piece tiles (dresser, nightstand, chest, mirror, bed) into a single tile,
// mirroring PackageCards. Used for collections that have NO published set
// package; packaged collections show their PackageCards instead. The whole card
// is the drill-in (there is no per-collection detail page): it routes to the
// flat piece list via ?collection=, so a shopper who wants just the chest lands
// there.
export type CollectionCard = {
  collection: string;
  image: string | null;
  fromPrice: number;
  count: number;
  inStock: boolean;
};

export default function CollectionCards({
  collections,
  title = 'Shop by collection',
}: {
  collections: CollectionCard[];
  title?: string;
}) {
  if (collections.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-charcoal">{title}</h2>
          <p className="text-sm text-brand-charcoal-light mt-0.5">
            Browse the full collection — pieces sold together or on their own.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {collections.map((c) => (
          <Link
            key={c.collection}
            href={`/shop?collection=${encodeURIComponent(c.collection)}`}
            className="group relative bg-white rounded-xl border border-brand-border overflow-hidden hover:shadow-lg hover:border-brand-yellow transition-all block"
          >
            <div className="relative aspect-[4/3] bg-brand-warm-gray flex items-center justify-center overflow-hidden">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.collection} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl opacity-30">🛏</span>
              )}
              {!c.inStock && (
                <span className="absolute bottom-2 left-2 bg-white/90 text-brand-charcoal-light text-[11px] font-semibold px-2 py-1 rounded-full">
                  Special order
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-brand-charcoal group-hover:text-brand-yellow-dark transition-colors line-clamp-2">
                {c.collection}
              </h3>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-base font-bold text-brand-charcoal">From {money(c.fromPrice)}</span>
              </div>
              <p className="text-xs text-brand-charcoal-light mt-1">
                {c.count} {c.count === 1 ? 'piece' : 'pieces'} — shop collection
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
