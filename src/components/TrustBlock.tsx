import Link from 'next/link';
import { TRUST_POINTS, RETURNS } from '@/lib/policy';
import CheckDeliveryButton from './CheckDeliveryButton';

// The contrast block, next to Add to Cart.
//
// The online discounters that carry these same manufacturer SKUs compete on
// sticker price, and their weakness is everything AFTER the click: opaque
// multi-week freight, assembly as an upsell, and phone haggling instead of a
// posted price. This states the opposite in four lines at the moment of the
// decision. It is static copy with no data dependency — the cheapest
// conversion work on the site.
//
// Deliberately positives-first, with the change-of-mind terms stated plainly
// rather than buried: a 20% restocking fee discovered after purchase is
// exactly the kind of surprise the no-games position exists to avoid. The
// detail lives on /returns; the summary here must not read as though there
// were nothing to know.
export default function TrustBlock() {
  return (
    <div className="mt-6 rounded-xl border border-brand-border bg-brand-warm-gray/40 p-4">
      <ul className="space-y-2.5">
        {TRUST_POINTS.map((p) => (
          <li key={p.text} className="flex items-start gap-2.5 text-sm text-brand-charcoal">
            <span aria-hidden="true" className="shrink-0 leading-5">{p.icon}</span>
            <span className="leading-5">{p.text}</span>
          </li>
        ))}
      </ul>

      {/* The delivery figure used to live in the list above. It was removed
          2026-08-14 because a single from-price is only true inside 50 miles —
          and this is the honest replacement: the shopper gets a real number for
          their own address instead of a floor that understates the further out
          they live. The label says "pricing" deliberately; with no figure in the
          list, this is what signals delivery is charged rather than free. */}
      <div className="mt-3">
        <CheckDeliveryButton
          className="w-full !py-2.5 !text-sm"
          label="Check delivery availability &amp; pricing"
        />
      </div>

      <p className="mt-3 pt-3 border-t border-brand-border text-xs text-brand-charcoal-light leading-relaxed">
        Changed your mind? {RETURNS.changeOfMindDays} days, returned as delivered. Still sealed —
        no restocking fee. Out of the box — {RETURNS.refundType} less {RETURNS.restockingFeePercent}%.{' '}
        <Link href="/returns" className="text-brand-yellow-dark hover:underline font-medium">
          Full returns &amp; price-match terms
        </Link>
      </p>
    </div>
  );
}
