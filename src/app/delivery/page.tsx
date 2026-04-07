import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delivery Information',
  description: 'Professional in-home furniture delivery across the Birmingham metro. Learn about delivery options, pricing, and scheduling.',
};

export default function DeliveryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Delivery &amp; Pickup</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-lg mx-auto">
          Professional white-glove delivery across the Birmingham metro, or pick up from our Irondale warehouse.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
        {/* Delivery */}
        <div className="bg-white border border-brand-border rounded-2xl p-8">
          <div className="text-3xl mb-4">🚚</div>
          <h2 className="text-xl font-bold text-brand-charcoal mb-3">In-Home Delivery</h2>
          <p className="text-sm text-brand-charcoal-light mb-5 leading-relaxed">
            Our professional delivery team brings your furniture inside, places it in your room of choice,
            and removes all packaging. We treat your home like our own.
          </p>
          <ul className="space-y-3 mb-6">
            {[
              'White-glove in-home placement',
              'Packaging removal and cleanup',
              'Flexible scheduling — choose your date and time window',
              'Real-time delivery tracking and ETA notifications',
              'Assembly available for select items',
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="text-brand-green mt-0.5 shrink-0">✓</span>
                <span className="text-brand-charcoal-light">{f}</span>
              </li>
            ))}
          </ul>
          <div className="bg-brand-warm-gray rounded-lg p-4">
            <p className="text-sm text-brand-charcoal">
              <span className="font-semibold">Delivery pricing</span> is based on distance from our warehouse
              and is quoted at checkout. Typical range: <span className="font-semibold">$99 – $249</span>.
            </p>
          </div>
        </div>

        {/* Pickup */}
        <div className="bg-white border border-brand-border rounded-2xl p-8">
          <div className="text-3xl mb-4">🏪</div>
          <h2 className="text-xl font-bold text-brand-charcoal mb-3">Warehouse Pickup</h2>
          <p className="text-sm text-brand-charcoal-light mb-5 leading-relaxed">
            Save on delivery by picking up your furniture at our Irondale warehouse.
            Schedule your pickup time and we&apos;ll have everything ready.
          </p>
          <ul className="space-y-3 mb-6">
            {[
              'No delivery fee',
              'Schedule your pickup time in advance',
              'Items loaded by our warehouse team',
              'Same-day pickup available on in-stock items',
              'Bring a truck or trailer — we can help load',
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="text-brand-green mt-0.5 shrink-0">✓</span>
                <span className="text-brand-charcoal-light">{f}</span>
              </li>
            ))}
          </ul>
          <div className="bg-brand-warm-gray rounded-lg p-4">
            <p className="text-sm text-brand-charcoal">
              <span className="font-semibold">Pickup location:</span> Irondale Warehouse<br />
              <span className="text-brand-charcoal-light">7516 Crestwood Blvd, Irondale, AL 35210</span>
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-brand-charcoal text-center mb-8">Common Questions</h2>
        {[
          { q: 'How far do you deliver?', a: 'We deliver throughout the Birmingham metro area and surrounding counties. Delivery fees are distance-based and quoted at the time of purchase.' },
          { q: 'Can I choose a specific delivery time?', a: 'Yes! When scheduling your delivery, you can select from available time windows. We also send real-time notifications with ETA updates on delivery day.' },
          { q: 'What if my item is damaged during delivery?', a: 'We stand behind every delivery. If anything arrives damaged, contact us immediately and we will arrange a replacement or repair at no cost to you.' },
          { q: 'Do you deliver to apartments or upstairs?', a: 'Absolutely. Our delivery team is experienced with apartments, condos, and multi-story homes. No additional charge for stairs.' },
          { q: 'How long until my furniture is delivered?', a: 'In-stock items can typically be delivered within 3-7 business days. Custom orders are delivered once all items arrive from the vendor.' },
        ].map(faq => (
          <div key={faq.q} className="border-b border-brand-border py-5">
            <h3 className="font-semibold text-brand-charcoal mb-2">{faq.q}</h3>
            <p className="text-sm text-brand-charcoal-light leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link href="/shop" className="btn-brand">Start Shopping</Link>
      </div>
    </div>
  );
}
