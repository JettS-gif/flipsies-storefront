import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Flipsies Furniture. Call, visit, or send us a message.',
};

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Contact Us</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-lg mx-auto">
          Have a question? We&apos;d love to hear from you. Reach out by phone or visit us in person.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
        {/* Hoover */}
        <div className="bg-white border border-brand-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-brand-charcoal mb-4">Hoover Showroom</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">📍</span>
              <div>
                <p className="font-medium text-brand-charcoal">1651 Montgomery Hwy S</p>
                <p className="text-brand-charcoal-light">Hoover, AL 35244</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">📞</span>
              <a href="tel:2059883551" className="font-medium text-brand-charcoal hover:text-brand-yellow-dark">(205) 988-3551</a>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">🕐</span>
              <div>
                <p className="text-brand-charcoal">Mon–Sat: 10am – 7pm</p>
                <p className="text-brand-charcoal-light">Sun: 12pm – 5pm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Irondale */}
        <div className="bg-white border border-brand-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-brand-charcoal mb-4">Irondale Showroom</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">📍</span>
              <div>
                <p className="font-medium text-brand-charcoal">7516 Crestwood Blvd</p>
                <p className="text-brand-charcoal-light">Irondale, AL 35210</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">📞</span>
              <a href="tel:2059560600" className="font-medium text-brand-charcoal hover:text-brand-yellow-dark">(205) 956-0600</a>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">🕐</span>
              <div>
                <p className="text-brand-charcoal">Mon–Sat: 10am – 7pm</p>
                <p className="text-brand-charcoal-light">Sun: 12pm – 5pm</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-brand-warm-gray rounded-2xl p-8 max-w-3xl mx-auto text-center">
        <h2 className="text-xl font-bold text-brand-charcoal mb-4">Looking for Something Specific?</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/delivery" className="btn-outline text-sm py-2.5 px-5">Delivery Info</Link>
          <Link href="/financing" className="btn-outline text-sm py-2.5 px-5">Financing Options</Link>
          <Link href="/shop" className="btn-outline text-sm py-2.5 px-5">Browse Products</Link>
          <Link href="/locations" className="btn-outline text-sm py-2.5 px-5">Get Directions</Link>
        </div>
      </div>
    </div>
  );
}
