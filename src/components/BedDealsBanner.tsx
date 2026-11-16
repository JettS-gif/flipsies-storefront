import Link from 'next/link';
import { BED_DEALS_ANCHOR, fetchCompleteBeds } from '@/lib/bedDeals';

// Home-page band pointing at the complete-bed bundles on /deals. Hidden until at
// least one bundle is published, so the home page never advertises a deal the
// shopper can't open.
export default async function BedDealsBanner() {
  const { queen, king } = await fetchCompleteBeds();
  if (!queen.length && !king.length) return null;
  return (
    <section className="bg-brand-yellow-light border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow-dark">Complete beds</p>
          <p className="text-2xl font-extrabold text-brand-charcoal">Queen $499 · King $599</p>
          <p className="text-sm text-brand-charcoal-light">Upholstered bed + mattress, one everyday price.</p>
        </div>
        <Link href={`/deals#${BED_DEALS_ANCHOR}`} className="btn-brand !py-4 !px-8 whitespace-nowrap">
          See the bed deals
        </Link>
      </div>
    </section>
  );
}
