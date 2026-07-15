import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vendor Portal',
  description: 'Information for furniture vendors and trade partners working with Flipsies Furniture.',
};

const STORE_EMAIL = 'jett@flipsiesfurniture.com';
const STORE_PHONE = '(205) 238-5076';

export default function VendorLoginPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center">
        <div className="text-4xl mb-6">🏭</div>
        <h1 className="text-3xl font-bold text-brand-charcoal mb-3">Vendor Portal</h1>
        <p className="text-brand-charcoal-light leading-relaxed mb-8">
          A self-serve portal for our furniture vendors — purchase order
          status, ETAs, shipment confirmation, and invoice submission —
          is in development.
        </p>

        <div className="bg-brand-warm-gray rounded-2xl p-8 mb-8 text-left">
          <h2 className="text-base font-semibold text-brand-charcoal mb-3">
            In the meantime
          </h2>
          <p className="text-sm text-brand-charcoal-light mb-4">
            For PO questions, ETA updates, or shipment confirmation,
            please reach out directly:
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="text-brand-charcoal-light">Email:</span>{' '}
              <a href={`mailto:${STORE_EMAIL}`} className="text-brand-yellow-dark font-medium hover:underline">
                {STORE_EMAIL}
              </a>
            </li>
            <li>
              <span className="text-brand-charcoal-light">Phone:</span>{' '}
              <a href={`tel:${STORE_PHONE.replace(/\D/g, '')}`} className="text-brand-yellow-dark font-medium hover:underline">
                {STORE_PHONE}
              </a>
            </li>
          </ul>
        </div>

        <Link href="/" className="btn-outline text-sm">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
