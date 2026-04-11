import Link from "next/link";
import CheckDeliveryButton from "@/components/CheckDeliveryButton";

const CATEGORIES = [
  { name: "Living Room", slug: "living-room", icon: "🛋", description: "Sofas, loveseats, recliners & accent chairs" },
  { name: "Sectionals", slug: "sectionals", icon: "🔲", description: "Build your perfect layout with our sectional builder" },
  { name: "Bedroom", slug: "bedroom", icon: "🛏", description: "Beds, dressers, nightstands & mattresses" },
  { name: "Dining Room", slug: "dining-room", icon: "🍽", description: "Tables, chairs, buffets & bar stools" },
  { name: "Mattresses", slug: "mattresses", icon: "💤", description: "Top brands at unbeatable prices" },
  { name: "Home Office", slug: "home-office", icon: "💼", description: "Desks, office chairs & bookshelves" },
];

const VALUE_PROPS = [
  { icon: "🚚", title: "Local Delivery", description: "Professional in-home delivery across the Birmingham metro" },
  { icon: "💳", title: "Flexible Financing", description: "Multiple financing options including Synchrony and Progressive Leasing" },
  { icon: "🏷", title: "Honest Pricing", description: "No hidden fees, no markup games — just fair prices on quality furniture" },
  { icon: "🛡", title: "Satisfaction Guaranteed", description: "We stand behind every piece we sell" },
];

export default function Home() {
  return (
    <>
      {/* Hero — image-first layout. The headline, subhead, promo badge,
          and tagline are all baked into the image itself (hero-home.jpg),
          so the landing page just renders the image full-width and puts
          the three CTA buttons in a clean strip below it. Changing the
          hero seasonally only requires dropping a new JPG into
          public/images/hero-home.jpg — no code edit, no text re-typing. */}
      <section className="bg-brand-warm-gray">
        <div className="max-w-7xl mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-home.jpg"
            alt="Quality furniture at Flipsies Furniture — visit our Alabama showrooms"
            className="w-full h-auto block"
            // The image is baked at a fixed aspect ratio so the browser
            // can reserve the layout space before the JPG decodes.
            // Matches the source image dimensions to prevent layout shift.
            width={1408}
            height={760}
          />
        </div>
        {/* CTA button strip — stays below the image, centered on all
            screen sizes. Wraps naturally on mobile since CheckDeliveryButton
            opens a modal and doesn't need hover state. */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16 pt-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/shop" className="btn-brand">
              Shop Now
            </Link>
            <Link href="/sectionals" className="btn-outline">
              Build a Sectional
            </Link>
            {/* Opens the Phase 2.A.2 "Can we deliver to you?" form in a
                modal. Stays in the hero row so the landing page is
                uncluttered but the lead-capture surface is still one
                click away for anyone checking range before shopping. */}
            <CheckDeliveryButton />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Shop by Category</h2>
        <p className="text-brand-charcoal-light mb-10">Find exactly what you&apos;re looking for</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop/${cat.slug}`}
              className="group relative bg-brand-warm-gray rounded-xl p-6 lg:p-8 border border-transparent
                hover:border-brand-yellow hover:shadow-lg transition-all duration-200"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="text-lg font-semibold text-brand-charcoal group-hover:text-brand-yellow-dark transition-colors">
                {cat.name}
              </h3>
              <p className="text-sm text-brand-charcoal-light mt-1">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Props */}
      <section className="bg-brand-charcoal text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {VALUE_PROPS.map((prop) => (
              <div key={prop.title}>
                <div className="text-3xl mb-3">{prop.icon}</div>
                <h3 className="text-base font-semibold mb-1">{prop.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
        <h2 className="text-3xl font-bold text-brand-charcoal mb-4">Visit Our Showrooms</h2>
        <p className="text-brand-charcoal-light max-w-xl mx-auto mb-8">
          See it, feel it, love it. Our Hoover and Irondale showrooms are stocked
          with the latest styles at prices you won&apos;t find anywhere else.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/locations" className="btn-brand">
            Get Directions
          </Link>
          <Link href="/shop" className="btn-outline">
            Browse Online
          </Link>
        </div>
      </section>
    </>
  );
}
