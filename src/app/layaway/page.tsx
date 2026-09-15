import Link from 'next/link';
import { pageMetadata, SHOWROOMS, HOURS_DISPLAY } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Layaway',
  description: 'Yes, Flipsies Furniture offers layaway. Call or visit our Hoover or Irondale showroom and our team will get you set up.',
  path: '/layaway',
});

// Deliberately says only "we offer it, call the store" (Jett, 2026-09-15). The
// printed invoice carries real terms (deposit, hold period, forfeiture) but none
// were authorised for this page — a term published here becomes a promise, so
// add one only when Jett has approved the wording.
export default function LayawayPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Layaway</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-lg mx-auto">
          Yes, we offer layaway! Found something you love but not ready to take it home today? We can help.
        </p>
      </div>

      <div className="bg-brand-yellow-light border border-brand-border rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-charcoal">Getting Started Is Easy</h2>
        <p className="text-brand-charcoal-light mt-2 max-w-xl mx-auto">
          Give either showroom a call or stop by in person. Our team will walk you through it and get your
          layaway set up.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
        {SHOWROOMS.map((sr) => (
          <div key={sr.slug} className="bg-white border border-brand-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-brand-charcoal mb-1">{sr.city} Showroom</h2>
            <address className="not-italic text-sm text-brand-charcoal-light mb-4">
              {sr.street}, {sr.city}, {sr.state} {sr.zip}
            </address>

            <div className="mb-5">
              {HOURS_DISPLAY.map((h) => (
                <div key={h.days} className="flex justify-between text-sm py-1">
                  <span className="text-brand-charcoal-light">{h.days}</span>
                  <span className="font-medium text-brand-charcoal">{h.time}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <a href={`tel:${sr.phone.replace(/\D/g, '')}`} className="flex-1 text-center btn-brand text-sm py-2.5">
                Call {sr.phone}
              </a>
              <a href={sr.mapUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center btn-outline text-sm py-2.5">
                Directions
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-brand-charcoal-light mb-6 max-w-md mx-auto">
          Want to pick out your furniture first? Browse online, then give us a call.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/shop" className="btn-brand">Browse Furniture</Link>
          <Link href="/financing" className="btn-outline">Financing Options</Link>
        </div>
      </div>
    </div>
  );
}
