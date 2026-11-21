import type { StorefrontPackage } from '@/lib/packages';
import { BED_DEALS_ANCHOR } from '@/lib/bedDeals';
import PackageCards from './PackageCards';

// Deals page block for the complete-bed bundles (bed + mattress, one price).
// The id is where the in-store bed sign's QR lands (/deals#beds); scroll-mt keeps
// the heading clear of the sticky header. Renders nothing until a bundle is
// published. While the radio hunt is open the anchor moves to the hunt box at the top of the page
// (HuntVaultBox), so `anchor` is false then and the id is never on two elements.
export default function BedDealsSection({
  queen,
  king,
  anchor = true,
}: {
  queen: StorefrontPackage[];
  king: StorefrontPackage[];
  anchor?: boolean;
}) {
  if (!queen.length && !king.length) return null;
  return (
    <section id={anchor ? BED_DEALS_ANCHOR : undefined} className="scroll-mt-28 mb-14">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-brand-charcoal">
          Complete beds: Queen $499 · King $599
        </h2>
        <p className="text-sm text-brand-charcoal-light mt-1">
          An upholstered bed and a mattress at one everyday price. In stock at our Hoover showroom.
        </p>
      </header>

      <PackageCards
        packages={queen}
        title="Complete Queen Bed: $499"
        subtitle="Queen upholstered bed + Essential 8″ queen mattress."
      />
      <PackageCards
        packages={king}
        title="Complete King Bed: $599"
        subtitle="King upholstered bed + Dreamer 10″ king mattress."
      />
    </section>
  );
}
