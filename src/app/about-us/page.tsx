import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Flipsies Furniture — quality furniture at honest prices. Serving the Birmingham, Alabama metro area.',
};

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal mb-4">About Flipsies Furniture</h1>
        <p className="text-lg text-brand-charcoal-light leading-relaxed">
          We believe everyone deserves a home they love — without paying luxury prices.
          At Flipsies, we source quality furniture directly and pass the savings on to you.
        </p>
      </div>

      {/* Values */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {[
          { icon: '🏷', title: 'Honest Pricing', desc: 'No games, no inflated MSRPs, no fake sales. Just fair prices on quality furniture, every day.' },
          { icon: '🤝', title: 'Real Service', desc: 'Our team knows furniture. We help you find what fits your space, style, and budget — no pressure.' },
          { icon: '🚚', title: 'White-Glove Delivery', desc: 'Professional in-home delivery with placement and packaging removal. We treat your home like ours.' },
          { icon: '🛡', title: 'Stand Behind It', desc: 'If something isn\'t right, we make it right. We\'re a local business and our reputation matters.' },
        ].map(v => (
          <div key={v.title} className="bg-brand-warm-gray rounded-xl p-6">
            <div className="text-2xl mb-3">{v.icon}</div>
            <h3 className="font-semibold text-brand-charcoal mb-2">{v.title}</h3>
            <p className="text-sm text-brand-charcoal-light leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Showrooms */}
      <div className="bg-brand-charcoal text-white rounded-2xl p-8 sm:p-12 mb-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Two Showrooms, One Mission</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            With showrooms in Hoover and Irondale, we&apos;re proud to serve the Birmingham metro area.
            Each location is stocked with living room, bedroom, dining, and mattress collections
            ready for you to see and feel in person.
          </p>
          <Link href="/locations" className="btn-brand">Visit a Showroom</Link>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-charcoal mb-3">Ready to Find Your Perfect Piece?</h2>
        <p className="text-brand-charcoal-light mb-6">Browse online or visit us in-store. No appointment needed.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/shop" className="btn-brand">Shop Online</Link>
          <Link href="/contact" className="btn-outline">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
