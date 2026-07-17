import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import { WARRANTY_BRANDS, brandSlug } from '@/lib/warranty';

export const metadata = pageMetadata({
  title: 'Warranty Information',
  description: 'Manufacturer warranty coverage by brand for the furniture and mattresses we carry at Flipsies Furniture.',
  path: '/warranty',
});

export default function WarrantyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Warranty Information</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-2xl mx-auto">
          The furniture and mattresses we sell are covered by the manufacturer&apos;s warranty. Find your
          brand below for its coverage details, or reach out and our team will help you file a claim.
        </p>
      </div>

      {/* Brand list — each card is deep-linkable via /warranty#<slug> from a PDP. */}
      <div className="grid sm:grid-cols-2 gap-4 mb-16">
        {WARRANTY_BRANDS.map((w) => {
          const slug = brandSlug(w.brand);
          return (
            <div
              key={w.brand}
              id={slug}
              className="scroll-mt-24 bg-white border border-brand-border rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <h2 className="text-base font-bold text-brand-charcoal">{w.brand}</h2>
              {w.summary ? (
                <p className="text-sm text-brand-charcoal-light mt-1 leading-relaxed">{w.summary}</p>
              ) : (
                <p className="text-sm text-brand-charcoal-light mt-1">
                  Manufacturer&apos;s limited warranty — full details available at our showrooms.
                </p>
              )}
              {w.url ? (
                <a
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-yellow-dark hover:text-brand-charcoal transition-colors"
                >
                  View {w.brand} warranty →
                </a>
              ) : (
                <p className="mt-3 text-xs text-brand-charcoal-light">
                  <Link href="/locations" className="text-brand-yellow-dark hover:underline">
                    Contact a showroom
                  </Link>{' '}
                  for the full warranty document.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* How claims work */}
      <div className="bg-brand-charcoal text-white rounded-2xl p-8 sm:p-12 max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Filing a Warranty Claim</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Keep your receipt', desc: 'Your Flipsies invoice is your proof of purchase — most manufacturers require it.' },
            { step: '2', title: 'Reach out to us', desc: 'Contact the showroom where you purchased. We coordinate the claim with the manufacturer for you.' },
            { step: '3', title: 'Resolution', desc: 'Repair, replacement parts, or replacement per the manufacturer\'s coverage — we\'ll keep you posted.' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 bg-brand-yellow text-brand-charcoal rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                {s.step}
              </div>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-charcoal mb-3">Questions About Coverage?</h2>
        <p className="text-brand-charcoal-light mb-6 max-w-md mx-auto">
          Our team is happy to walk you through what your warranty covers. Stop by a showroom or get in touch.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/locations" className="btn-brand">Find a Showroom</Link>
          <Link href="/shop" className="btn-outline">Browse Furniture</Link>
        </div>
      </div>
    </div>
  );
}
