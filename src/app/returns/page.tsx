import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import { RETURNS, PRICE_MATCH, DELIVERY } from '@/lib/policy';

export const metadata = pageMetadata({
  title: 'Returns, Exchanges & Price Match',
  description:
    'Damaged on arrival? Swapped within 24 hours. Change-of-mind exchanges, our 50-mile price match, ' +
    'and what our delivery crews do and do not do — stated plainly.',
  path: '/returns',
});

// The page the PDP trust block links to. Every figure here reads from
// lib/policy so this page, the trust block and the Product JSON-LD cannot drift.
//
// Written plainly on purpose. The brand position is no-games pricing, and a
// policy page that buries the restocking fee under three clicks contradicts
// that more loudly than the fee itself ever would.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-brand-charcoal mb-3">{title}</h2>
      <div className="text-sm text-brand-charcoal-light leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Returns, Exchanges &amp; Price Match</h1>
      <p className="text-brand-charcoal-light mt-3 mb-10">
        Short version: if we got it wrong, we fix it fast and it costs you nothing. If you changed your
        mind, there is a fee — and we would rather you read it here than find out later.
      </p>

      <Section title="Damaged or defective on arrival">
        <p>
          We swap it within <strong>{RETURNS.defectiveSwapHours} hours</strong>, at no cost to you, as long as
          the replacement is in stock. Tell the delivery crew at the door if you can — they can often start
          the swap before they leave. Otherwise call the showroom the same day.
        </p>
      </Section>

      <Section title="Changed your mind">
        <p>
          If a piece does not fit the room, or you simply want something else, we will exchange it for{' '}
          <strong>{RETURNS.refundType}</strong>, less a <strong>{RETURNS.restockingFeePercent}% restocking fee</strong>.
        </p>
        <p>
          If we have to collect the item {RETURNS.redeliveryFeeApplies}, a pickup fee may also apply. Arrange it
          the same day as the delivery and there is no collection charge.
        </p>
        <p className="text-brand-charcoal">
          <strong>Not eligible:</strong> {RETURNS.excluded.join(', ')}. Custom orders are built to your
          specification and cannot be resold, and floor models and clearance pieces are already discounted
          to move.
        </p>
      </Section>

      <Section title="Price match">
        <p>
          Find the same item advertised for less by any competitor within{' '}
          <strong>{PRICE_MATCH.radiusMiles} miles</strong>, within{' '}
          <strong>{PRICE_MATCH.withinDays} days</strong> of your purchase, and we will match it.
        </p>
        <p>
          It has to be a quote for the <strong>same service</strong>, not just the same sticker. Our price
          includes white-glove in-home delivery and assembly; a cheaper price that leaves the box on your
          driveway is not the same offer, and we will show you the difference rather than argue about it.
        </p>
        <p className="text-brand-charcoal">
          <strong>Not eligible:</strong> {PRICE_MATCH.excluded.join(', ')}.
        </p>
      </Section>

      <Section title="What our delivery crews do">
        <p>
          In-stock pieces are delivered within <strong>{DELIVERY.inStockBusinessDays} business days</strong> of
          purchase. White-glove service is included — we bring it inside, place it in the room you want,
          assemble it and take the packaging away. <strong>We never charge separately for assembly.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Haul-away of your old furniture is available and charged separately.</li>
          <li>
            Our crews move what we sold you. They are not able to relocate furniture that did not come from
            us — including carrying an existing piece downstairs or out to the curb.
          </li>
          <li>
            If a crew judges that a delivery risks damaging the piece or your home — a tight stairwell, a
            narrow doorway, a finished wall — we will ask you to sign a damage waiver before we attempt it.
            We would rather stop and talk it through than force something through a doorway.
          </li>
          <li>Please have the space clear and ready before we arrive.</li>
        </ul>
      </Section>

      <div className="mt-12 pt-8 border-t border-brand-border text-sm text-brand-charcoal-light">
        Questions about a specific order?{' '}
        <Link href="/contact" className="text-brand-yellow-dark hover:underline font-medium">Contact us</Link>{' '}
        or{' '}
        <Link href="/track-order" className="text-brand-yellow-dark hover:underline font-medium">track your order</Link>.
      </div>
    </div>
  );
}
