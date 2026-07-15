import SectionalWizard from '@/components/SectionalWizard';
import Link from 'next/link';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Build Your Sectional',
  description:
    'Design your custom sectional layout with Flipsies Furniture. Pick a collection, choose your color, and select the exact pieces you need — chairs, loveseats, sofas, chaises, corners, and ottomans. Free delivery within 50 miles of Birmingham, AL.',
  path: '/sectionals',
});

// Phase 3.A.1 — dedicated /sectionals page. Mounts the list-based
// SectionalWizard. When a shopper arrives from a product-detail
// "Build your own" CTA, the page receives ?family=Tori&color=Spice
// query params which get forwarded as wizard seed values so the
// shopper skips the first one or two steps.
//
// Phase 3.A.2 will add a canvas-based configurator as an additional
// mode accessible via a toggle at the top of this page.

interface SectionalsPageProps {
  // Next.js 16 passes searchParams as a Promise that must be awaited
  // before reading individual keys (App Router async props contract).
  searchParams: Promise<{ family?: string; color?: string }>;
}

export default async function SectionalsPage({ searchParams }: SectionalsPageProps) {
  const { family, color } = await searchParams;
  return (
    <div className="bg-brand-warm-gray min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* Header */}
        <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-6">
          <Link href="/" className="hover:text-brand-charcoal transition-colors">Home</Link>
          <span>/</span>
          <span className="text-brand-charcoal font-medium">Sectionals</span>
        </nav>

        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal mb-3">
            Build Your Sectional
          </h1>
          <p className="text-base text-brand-charcoal-light leading-relaxed">
            Start with a collection, pick your color, and add the exact pieces you need.
            We match every piece to a real in-stock SKU so there are no surprises at delivery.
          </p>
        </div>

        <SectionalWizard seedFamily={family} seedColor={color} />

        {/* Help callout */}
        <div className="mt-10 max-w-2xl mx-auto bg-white rounded-xl border border-brand-border p-5 text-center">
          <p className="text-sm text-brand-charcoal">
            <strong>Need help planning a layout?</strong>
          </p>
          <p className="text-sm text-brand-charcoal-light mt-1 mb-3">
            Call either showroom and our team will walk you through a layout.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="tel:2052385076" className="btn-brand text-sm px-5 py-2.5">
              Hoover · (205) 238-5076
            </a>
            <a href="tel:2059574001" className="btn-brand text-sm px-5 py-2.5">
              Irondale · (205) 957-4001
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
