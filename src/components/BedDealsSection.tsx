import type { StorefrontPackage } from '@/lib/packages';
import { BED_DEALS_ANCHOR } from '@/lib/bedDeals';
import PackageCards from './PackageCards';

// Deals page block for the complete-bed bundles (bed + mattress, one price).
// The id is where the in-store bed sign's QR lands (/deals#beds); scroll-mt keeps
// the heading clear of the sticky header. Renders nothing until a bundle is
// published, except the hunt PIN, which must show even if photos lag.
export default function BedDealsSection({
  queen,
  king,
  pin,
}: {
  queen: StorefrontPackage[];
  king: StorefrontPackage[];
  pin: string | null;
}) {
  if (!queen.length && !king.length && !pin) return null;
  return (
    <section id={BED_DEALS_ANCHOR} className="scroll-mt-28 mb-14">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-brand-charcoal">
          Complete beds: Queen $499 · King $599
        </h2>
        <p className="text-sm text-brand-charcoal-light mt-1">
          An upholstered bed and a mattress at one everyday price. In stock at our Hoover showroom.
        </p>
      </header>

      {pin && (
        <div
          role="status"
          className="mb-6 rounded-xl border-2 border-brand-yellow bg-brand-yellow-light px-5 py-4 text-brand-charcoal"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow-dark">
            Scavenger hunt players
          </p>
          <p className="mt-1 text-lg">
            The Hoover vault PIN is scrambled:{' '}
            <strong className="tracking-widest">{pin.split('').join(' ')}</strong>. Hint: it&rsquo;s what you hit
            when the alarm goes off on a bed this comfortable. Unscramble it, tell the word to the Vault Keeper at
            the bed display, and show your Card A.
          </p>
        </div>
      )}

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
