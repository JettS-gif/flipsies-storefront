import Link from 'next/link';
import { pageMetadata, ACCESSIBILITY, SHOWROOMS } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Accessibility',
  description:
    'How to reach us if any part of this site is difficult to use, and what we are doing about ' +
    'accessibility. If the website gets in your way, we will complete your order with you by phone.',
  path: '/accessibility',
});

// Deliberately does NOT claim conformance.
//
// Furniture retail is a frequent target of ADA web-accessibility litigation, and
// a missing statement is often what plaintiff firms scan for — so the page needs
// to exist. But claiming "WCAG 2.1 AA compliant" without an audit is worse than
// saying nothing: it is a documented, checkable assertion that hands over the
// case. No audit has been done (Jett, 2026-08-05), so the page says so.
//
// The substance is the alternative channel. An accessibility statement that only
// expresses good intentions does nothing for the person who cannot use the site;
// a phone number that will actually complete their order is a real
// accommodation, and it is also the strongest evidence of good faith available.

export default function AccessibilityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Accessibility</h1>
      <p className="text-brand-charcoal-light mt-3 mb-10">
        We want anyone to be able to shop with us — on this site, by phone, or in a showroom. If the
        website is getting in your way, the fastest fix is to call us and we will do it with you.
      </p>

      <div className="rounded-xl border border-brand-border bg-brand-warm-gray/40 p-5 mb-10">
        <h2 className="text-lg font-bold text-brand-charcoal mb-2">If this site is hard for you to use</h2>
        <p className="text-sm text-brand-charcoal-light leading-relaxed">
          Call <a href={`tel:${ACCESSIBILITY.phoneHref}`} className="text-brand-yellow-dark font-medium hover:underline">{ACCESSIBILITY.phone}</a>{' '}
          or email <a href={`mailto:${ACCESSIBILITY.email}`} className="text-brand-yellow-dark font-medium hover:underline">{ACCESSIBILITY.email}</a>.
          You will reach {ACCESSIBILITY.contactName}, and we aim to respond within{' '}
          <strong>{ACCESSIBILITY.responseTime}</strong>.
        </p>
        <p className="text-sm text-brand-charcoal-light leading-relaxed mt-3">
          We can browse the catalogue with you, quote delivery, take payment and place the order over
          the phone — <strong>everything the website does, a person here can do with you instead.</strong>{' '}
          You do not need to explain why.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-brand-charcoal mb-3">Where we actually stand</h2>
        <div className="text-sm text-brand-charcoal-light leading-relaxed space-y-3">
          <p>
            We are working toward the <strong>Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong>.
            That is the standard we are aiming at.
          </p>
          <p>
            <strong>We have not completed a formal accessibility audit</strong>, so we are not going to
            tell you the site conforms. Parts of it almost certainly fall short, and we would rather say
            that plainly than publish a claim we cannot stand behind — the same reason we do not
            advertise fake discounts.
          </p>
          <p>
            We build with semantic HTML, keyboard-reachable controls, labelled form fields, alt text on
            product photography and text that meets contrast requirements. Newer parts of the site are
            better than older ones.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-brand-charcoal mb-3">Known gaps</h2>
        <div className="text-sm text-brand-charcoal-light leading-relaxed space-y-3">
          <p>
            Some product photography has no descriptive alt text yet, and part of our catalogue has no
            photograph at all — we are working through that.
          </p>
          <p>
            Some content comes from third parties we do not control, including embedded maps and
            payment fields. If one of those blocks you, call us and we will complete the order for you.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-brand-charcoal mb-3">In person</h2>
        <p className="text-sm text-brand-charcoal-light leading-relaxed">
          Both showrooms are step-free at the entrance with accessible parking, and there is always
          someone who can walk the floor with you, read tags aloud, or bring pieces to you.
        </p>
        <ul className="mt-3 space-y-1">
          {SHOWROOMS.map((sr) => (
            <li key={sr.slug} className="text-sm">
              <Link href={`/locations/${sr.slug}`} className="text-brand-yellow-dark hover:underline font-medium">
                {sr.city} showroom
              </Link>
              <span className="text-brand-charcoal-light"> — {sr.phone}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-brand-charcoal mb-3">Tell us what broke</h2>
        <p className="text-sm text-brand-charcoal-light leading-relaxed">
          If something on this site did not work for you, we want to hear it — what page you were on,
          what you were trying to do, and what happened. That is how the list of known gaps above gets
          shorter. {ACCESSIBILITY.contactName} reads these:{' '}
          <a href={`mailto:${ACCESSIBILITY.email}`} className="text-brand-yellow-dark font-medium hover:underline">{ACCESSIBILITY.email}</a>.
        </p>
      </section>
    </div>
  );
}
