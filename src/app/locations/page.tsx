import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Locations',
  description: 'Visit Flipsies Furniture showrooms in Hoover and Irondale, Alabama. Find directions, hours, and contact info.',
};

const LOCATIONS = [
  {
    name: 'Hoover Showroom',
    address: '1651 Montgomery Hwy S, Hoover, AL 35244',
    phone: '(205) 988-3551',
    hours: [
      { days: 'Monday – Saturday', time: '10:00 AM – 7:00 PM' },
      { days: 'Sunday', time: '12:00 PM – 5:00 PM' },
    ],
    mapUrl: 'https://maps.google.com/?q=1651+Montgomery+Hwy+S+Hoover+AL+35244',
    features: ['Full showroom', 'Mattress gallery', 'Financing available', 'Delivery scheduling'],
  },
  {
    name: 'Irondale Showroom',
    address: '7516 Crestwood Blvd, Irondale, AL 35210',
    phone: '(205) 956-0600',
    hours: [
      { days: 'Monday – Saturday', time: '10:00 AM – 7:00 PM' },
      { days: 'Sunday', time: '12:00 PM – 5:00 PM' },
    ],
    mapUrl: 'https://maps.google.com/?q=7516+Crestwood+Blvd+Irondale+AL+35210',
    features: ['Full showroom', 'Warehouse pickup', 'Financing available', 'Same-day pickup available'],
  },
];

export default function LocationsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Our Showrooms</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-lg mx-auto">
          Come see, touch, and test our furniture in person. Our showrooms are stocked with the latest styles.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {LOCATIONS.map(loc => (
          <div key={loc.name} className="bg-white border border-brand-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
            {/* Map placeholder */}
            <div className="h-48 bg-brand-warm-gray flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📍</div>
                <a href={loc.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-brand-yellow-dark hover:underline font-medium">
                  Open in Google Maps
                </a>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-xl font-bold text-brand-charcoal mb-1">{loc.name}</h2>
              <p className="text-sm text-brand-charcoal-light mb-4">{loc.address}</p>

              {/* Hours */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">Hours</h3>
                {loc.hours.map(h => (
                  <div key={h.days} className="flex justify-between text-sm py-1">
                    <span className="text-brand-charcoal-light">{h.days}</span>
                    <span className="font-medium text-brand-charcoal">{h.time}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="mb-5">
                <div className="flex flex-wrap gap-2">
                  {loc.features.map(f => (
                    <span key={f} className="text-[11px] bg-brand-warm-gray text-brand-charcoal-light px-3 py-1 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a href={`tel:${loc.phone.replace(/\D/g, '')}`}
                  className="flex-1 text-center btn-brand text-sm py-2.5">
                  Call {loc.phone}
                </a>
                <a href={loc.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center btn-outline text-sm py-2.5">
                  Directions
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-16">
        <p className="text-brand-charcoal-light mb-4">Can&apos;t make it in? Browse our full collection online.</p>
        <Link href="/shop" className="btn-brand">Shop Online</Link>
      </div>
    </div>
  );
}
