import Link from 'next/link';
import type { SectionalFamily } from '@/lib/sectional';

// Family cards for the shop — one "Build your [Family] Sectional" tile per
// collection, replacing the dozens of near-identical piece tiles in search.
// Each links into the builder seeded with that family.
export default function SectionalFamilyCards({
  families,
  title = 'Sectionals — build yours',
}: {
  families: SectionalFamily[];
  title?: string;
}) {
  if (families.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-charcoal">{title}</h2>
          <p className="text-sm text-brand-charcoal-light mt-0.5">
            Pick a collection, choose your color, and add the exact pieces you need.
          </p>
        </div>
        <Link
          href="/sectionals"
          className="text-brand-green font-semibold text-sm hover:underline whitespace-nowrap hidden sm:inline"
        >
          Build a sectional →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {families.map((f) => (
          <Link
            key={f.family}
            href={`/sectionals?family=${encodeURIComponent(f.family)}`}
            className="group block bg-white rounded-xl border border-brand-border overflow-hidden hover:shadow-lg hover:border-brand-yellow transition-all"
          >
            <div className="aspect-[4/3] bg-brand-warm-gray flex items-center justify-center overflow-hidden">
              {f.sample_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.sample_image} alt={`${f.family} sectional`} className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-4xl opacity-30">🛋</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-brand-charcoal group-hover:text-brand-yellow-dark transition-colors">
                {f.family} Sectional
              </h3>
              <p className="text-xs text-brand-charcoal-light mt-1">
                {f.colors.length > 0 ? `${f.colors.length} color${f.colors.length === 1 ? '' : 's'} · ` : ''}Build yours →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
