import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Financing Options',
  description: 'Flexible financing options at Flipsies Furniture. Synchrony, Progressive Leasing, and 1st Franklin available.',
};

const OPTIONS = [
  {
    name: 'Synchrony',
    icon: '💳',
    description: 'Traditional credit financing with promotional offers. Apply in-store for instant approval.',
    features: ['6-12 month promotional financing', 'No interest if paid in full', 'Easy monthly payments', 'Quick in-store application'],
    best_for: 'Customers with good credit looking for 0% promotional periods.',
  },
  {
    name: 'Progressive Leasing',
    icon: '📋',
    description: 'Lease-to-own option with no credit needed. Get approved regardless of credit history.',
    features: ['No credit needed', 'Flexible payment schedule', 'Early buyout options available', '90-day same-as-cash option'],
    best_for: 'Customers who want flexibility without a credit check.',
  },
  {
    name: '1st Franklin Financial',
    icon: '🏦',
    description: 'Personal installment loans with fixed monthly payments. Apply in-store with quick decisions.',
    features: ['Fixed monthly payments', 'Competitive rates', 'In-store application', 'Quick approval process'],
    best_for: 'Customers who prefer a traditional installment loan.',
  },
];

export default function FinancingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Financing Options</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-lg mx-auto">
          We believe great furniture should be accessible to everyone. Choose the payment plan that works best for you.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {OPTIONS.map(opt => (
          <div key={opt.name} className="bg-white border border-brand-border rounded-2xl p-6 hover:shadow-lg hover:border-brand-yellow transition-all">
            <div className="text-3xl mb-3">{opt.icon}</div>
            <h2 className="text-lg font-bold text-brand-charcoal mb-2">{opt.name}</h2>
            <p className="text-sm text-brand-charcoal-light mb-4 leading-relaxed">{opt.description}</p>

            <ul className="space-y-2 mb-5">
              {opt.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="text-brand-green mt-0.5 shrink-0">✓</span>
                  <span className="text-brand-charcoal-light">{f}</span>
                </li>
              ))}
            </ul>

            <div className="bg-brand-warm-gray rounded-lg p-3">
              <p className="text-xs text-brand-charcoal-light">
                <span className="font-semibold text-brand-charcoal">Best for: </span>
                {opt.best_for}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-brand-charcoal text-white rounded-2xl p-8 sm:p-12 max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Shop', desc: 'Find the perfect furniture for your home in-store or online.' },
            { step: '2', title: 'Apply', desc: 'Choose your financing option and apply in-store. Most approvals take minutes.' },
            { step: '3', title: 'Enjoy', desc: 'Take your furniture home and make comfortable monthly payments.' },
          ].map(s => (
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
        <h2 className="text-2xl font-bold text-brand-charcoal mb-3">Ready to Get Started?</h2>
        <p className="text-brand-charcoal-light mb-6 max-w-md mx-auto">
          Visit either of our showrooms to apply for financing. Our team will help you find the best option.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/locations" className="btn-brand">Find a Showroom</Link>
          <Link href="/shop" className="btn-outline">Browse Furniture</Link>
        </div>
      </div>
    </div>
  );
}
