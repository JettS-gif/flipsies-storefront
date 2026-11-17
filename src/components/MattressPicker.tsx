import Link from 'next/link';
import type { StorefrontPackage } from '@/lib/packages';
import { mattressLabel } from '@/lib/bedDeals';

const money = (n: number) =>
  // Cents shown: rounding $499.97 to whole dollars printed "$500" next to the "$499" headline.
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

// "Choose your mattress" for the complete-bed bundles. Each step is its own
// package (same bed, different mattress, Jett's set price), so picking one is a
// link to that package's page: price, cart button and structured data stay
// consistent, the same routing-not-client-state rule as the mattress size
// dropdown. Renders nothing for a bed with a single step.
export default function MattressPicker({
  current,
  ladder,
}: {
  current: StorefrontPackage;
  ladder: StorefrontPackage[];
}) {
  if (ladder.length < 2) return null;
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-brand-charcoal mb-2">Choose your mattress</h2>
      <ul className="border border-brand-border rounded-lg divide-y divide-brand-border overflow-hidden">
        {ladder.map((p) => {
          const on = p.id === current.id;
          return (
            <li key={p.id}>
              <Link
                href={`/package/${p.id}`}
                aria-current={on ? 'page' : undefined}
                scroll={false}
                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors ${
                  on ? 'bg-brand-yellow-light font-semibold text-brand-charcoal' : 'bg-white hover:bg-brand-warm-gray text-brand-charcoal'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`inline-block w-4 h-4 rounded-full border-2 ${on ? 'border-brand-yellow-dark bg-brand-yellow-dark' : 'border-brand-border'}`}
                  />
                  {mattressLabel(p)}
                </span>
                <span className="whitespace-nowrap">{money(p.price)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-brand-charcoal-light mt-1.5">Same bed, your choice of mattress. Price is for the bed and mattress together.</p>
    </div>
  );
}
