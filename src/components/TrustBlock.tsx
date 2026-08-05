import Link from 'next/link';
import { TRUST_POINTS, RETURNS } from '@/lib/policy';

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
      <p className="mt-3 pt-3 border-t border-brand-border text-xs text-brand-charcoal-light leading-relaxed">
        Changed your mind? Exchanges come back as {RETURNS.refundType} with a{' '}
        {RETURNS.restockingFeePercent}% restocking fee.{' '}
        <Link href="/returns" className="text-brand-yellow-dark hover:underline font-medium">
          Full returns &amp; price-match terms
        </Link>
      </p>
    </div>
  );
}
