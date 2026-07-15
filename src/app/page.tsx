import Link from "next/link";
import CheckDeliveryButton from "@/components/CheckDeliveryButton";
import ProductCarousel from "@/components/ProductCarousel";
import Reviews from "@/components/Reviews";
import { SHOWROOMS, OPENING_HOURS } from "@/lib/site";

const CATEGORIES = [
  { name: "Living Room", slug: "living-room", icon: "🛋", description: "Sofas, loveseats, recliners & accent chairs" },
  { name: "Sectionals", slug: "sectionals", icon: "🔲", description: "Build your perfect layout with our sectional builder" },
  { name: "Bedroom", slug: "bedroom", icon: "🛏", description: "Beds, dressers, nightstands & mattresses" },
  { name: "Dining Room", slug: "dining-room", icon: "🍽", description: "Tables, chairs, buffets & bar stools" },
  { name: "Mattresses", slug: "mattresses", icon: "💤", description: "Top brands at honest everyday prices" },
  { name: "Home Office", slug: "home-office", icon: "💼", description: "Desks, office chairs & bookshelves" },
];

// EDLP position pillars — the three claims that differentiate Flipsies in a
// market full of sale games. Kept high on the page (right under the hero) so
// the everyday-low / no-haggle / in-stock-now position lands before anything
// else. Urgency here comes from AVAILABILITY ("take it home today"), never a
// discount deadline — that's what keeps it EDLP and not Hi-Lo.
const PILLARS = [
  {
    icon: "🏷",
    title: "No-Haggle Pricing",
    body: "One honest price, every day. No negotiating, no “let me ask my manager” — the price on the tag is the price. No games, no pressure.",
  },
  {
    icon: "✅",
    title: "Price-Match Guarantee",
    body: "Find the same item for less at a store near you? We’ll match it. Shop with total confidence — you’re always paying a fair price.",
  },
  {
    icon: "🚚",
    title: "In Stock — Take It Home Today",
    body: "No 8-to-12-week special-order waits. What you see is in our warehouse right now, ready to deliver fast across the Birmingham metro.",
  },
];

// Logistics / reassurance — the practical facts that support the EDLP promise.
// Separated from the position pillars above so each band does one job.
const SERVICE = [
  { icon: "🚚", title: "Local Delivery", description: "Professional in-home delivery across the Birmingham metro — fast, because it’s already in stock." },
  { icon: "💳", title: "Flexible Financing", description: "Multiple options, including Synchrony and Progressive Leasing, to fit any budget." },
  { icon: "🏬", title: "Two Metro Showrooms", description: "Hoover and Irondale — both fully stocked and ready to shop, no appointment needed." },
  { icon: "🛡", title: "Satisfaction Guaranteed", description: "We stand behind every piece we sell, and every honest price we quote." },
];

export default function Home() {
  return (
    <>
      {/* Slim EDLP announcement bar — the position, persistent, first thing
          the page renders. Reinforces the everyday-low / no-haggle / in-stock
          promise above the hero (whose text is baked into the JPG). */}
      <div className="bg-brand-charcoal text-white text-center text-sm font-medium px-4 py-2.5">
        Everyday low prices · No haggling · Price-match guaranteed ·{" "}
        <span className="text-brand-yellow">In stock — take it home today</span>
      </div>

      {/* Hero — furniture background photo (swap public/images/hero-bg.jpg) under
          a left scrim so the copy stays readable. Delivery-forward: most orders
          are delivered, so the promise leads with fast local delivery, pairing
          with the Check-Delivery CTA. */}
      <section className="relative bg-brand-warm-gray border-b border-brand-border overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-warm-gray via-brand-warm-gray/90 to-brand-warm-gray/40" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow-dark mb-4">
              Hoover · Irondale · serving the Birmingham metro
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-brand-charcoal leading-tight text-balance">
              In stock now.{" "}
              <span className="text-brand-yellow-dark">Delivered fast.</span>
            </h1>
            <p className="mt-5 text-lg text-brand-charcoal-light leading-relaxed">
              Quality furniture at honest, everyday low prices — with fast local
              delivery across the Birmingham metro, in days, not weeks. Check your
              address to see the next available dates.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-stretch">
              <Link href="/shop" className="btn-brand flex-1 !py-5 !text-lg">
                Shop In-Stock Now
              </Link>
              <Link href="/sectionals" className="btn-outline flex-1 !py-5 !text-lg">
                Build a Sectional
              </Link>
              <CheckDeliveryButton className="flex-1 !py-5 !text-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Best-sellers carousel — real top sellers from sales data */}
      <ProductCarousel />

      {/* Showroom quick-info — real addresses + tap-to-call phones, high on the
          page so "visit us" is actionable, not a vague CTA. Full details (hours,
          directions) live in the Showrooms section below. */}
      <section className="bg-white border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
          {SHOWROOMS.map((sr) => (
            <div
              key={sr.name}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
            >
              <span className="font-semibold text-brand-charcoal">
                {sr.city} Showroom
              </span>
              <a
                href={`tel:${sr.phone.replace(/[^0-9]/g, "")}`}
                className="text-brand-green font-semibold hover:underline whitespace-nowrap"
              >
                {sr.phone}
              </a>
              <span className="w-full text-brand-charcoal-light">
                {sr.street}, {sr.city}, {sr.state} {sr.zip}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* EDLP position band — the differentiator, high on the page. */}
      <section className="bg-brand-yellow-light border-y border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
          <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-brand-charcoal text-balance">
              Honest everyday pricing. No games, no waiting for a sale.
            </h2>
            <p className="text-brand-charcoal-light mt-3 leading-relaxed">
              One fair price, every day — and it’s in stock right now, so you take it home today
              instead of waiting weeks for a special order. Shop with confidence you’re paying the
              same great price as everyone else.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="bg-white rounded-xl p-6 lg:p-7 border border-brand-border"
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="text-lg font-semibold text-brand-charcoal mb-2">{p.title}</h3>
                <p className="text-sm text-brand-charcoal-light leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Shop by Category</h2>
        <p className="text-brand-charcoal-light mb-10">Browse what’s in stock and ready to go home.</p>
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

      {/* Service / logistics */}
      <section className="bg-brand-charcoal text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {SERVICE.map((s) => (
              <div key={s.title}>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="text-base font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof — live Google rating + reviews (hidden until Places API key set) */}
      <Reviews />

      {/* Showrooms — both locations, real data from site.ts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center max-w-xl mx-auto mb-10 lg:mb-12">
          <h2 className="text-3xl font-bold text-brand-charcoal mb-3">Two Showrooms, One Honest Price</h2>
          <p className="text-brand-charcoal-light leading-relaxed">
            See it, feel it, sit in it — then take it home today. Both showrooms are fully stocked
            with the latest styles at the same honest, everyday prices.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHOWROOMS.map((sr) => {
            return (
              <div
                key={sr.name}
                className="bg-brand-warm-gray rounded-xl p-7 lg:p-8 border border-brand-border flex flex-col"
              >
                <h3 className="text-xl font-bold text-brand-charcoal mb-3">{sr.city} Showroom</h3>
                <address className="not-italic text-brand-charcoal-light leading-relaxed mb-1">
                  {sr.street}
                  <br />
                  {sr.city}, {sr.state} {sr.zip}
                </address>
                <a
                  href={`tel:${sr.phone.replace(/[^0-9]/g, "")}`}
                  className="text-brand-green font-semibold hover:underline"
                >
                  {sr.phone}
                </a>
                <p className="text-sm text-brand-charcoal-light mt-3">
                  {OPENING_HOURS.map((h) => h.replace("Mo-Sa", "Mon–Sat").replace("Su", "Sun")).join(" · ")}
                </p>
                <div className="mt-auto pt-6">
                  <a
                    href={sr.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-brand w-full text-center"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-10">
          <Link href="/shop" className="btn-outline">
            Browse Everything In Stock
          </Link>
        </div>
      </section>
    </>
  );
}
