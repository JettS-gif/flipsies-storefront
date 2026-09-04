// Careers — we are hiring, and until now the site never said so.
//
// WHY THIS EXISTS. It came out of the storefront search sweep (2026-09-04), not
// from a marketing plan. Among the searches that returned nothing were
// "careers", "job openings", "irondale store" and "store hous"[sic] — people
// using the product search box as site navigation because there was nowhere
// else to ask. No search fix can ever answer those; they wanted a page that did
// not exist. Jett: "Careers page is not a bad item to add as we are hiring."
//
// DELIBERATELY NO APPLICATION FORM. A form means collecting names, phone
// numbers and work history into a table, which needs a retention answer, a spam
// guard, somewhere in DeliverDesk to read them, and someone accountable for
// replying. Email, phone and walking in need none of that and are how these
// roles actually get filled today. If applications outgrow that, the form is a
// separate, deliberate build.
//
// ADDRESSES AND HOURS COME FROM lib/site.ts, never retyped. A careers page that
// sends someone to a stale address is worse than no careers page.

import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import JobApplicationForm from '@/components/JobApplicationForm';
import {
  pageMetadata, SHOWROOMS, HOURS_DISPLAY, STORE_EMAIL, SITE_URL, SITE_NAME,
} from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Careers',
  description:
    'Join the Flipsies Furniture team. Now hiring sales, delivery, warehouse and office roles at our Hoover and Irondale, Alabama showrooms.',
  path: '/careers',
});

// The date Google shows on a job listing. A CONSTANT, not `new Date()` — a
// posting that re-dates itself on every deploy tells Google it was posted today
// forever, which is exactly the pattern its job-spam guidance is written
// against. Bump it by hand when the openings are genuinely refreshed.
const POSTED = '2026-09-04';

interface Role {
  slug: string;
  title: string;
  blurb: string;
  duties: string[];
  where: string;
}

// Written from what these jobs actually involve here, not from a template. No
// invented pay, no invented benefits, no "rockstar" — everything below is
// either true or absent.
const ROLES: Role[] = [
  {
    slug: 'sales-associate',
    title: 'Sales Associate',
    blurb:
      'Help people furnish their homes. You will spend your day on the showroom floor learning what a customer needs and matching it to what we carry.',
    duties: [
      'Greet and work with customers on the floor — no pressure, no scripts',
      'Learn the catalog well enough to answer honestly about fit, fabric and lead time',
      'Write up orders and schedule deliveries on our own system (we will train you on it)',
      'Follow up with customers after the sale',
    ],
    where: 'Hoover or Irondale',
  },
  {
    slug: 'delivery-driver',
    title: 'Delivery Driver',
    blurb:
      'Run a delivery route across the Birmingham metro. This is white-glove work — furniture goes into the room it belongs in, and the packaging leaves with you.',
    duties: [
      'Drive a box truck on a scheduled route, typically with a helper',
      'Place furniture in the home, assemble where needed, remove packaging',
      'Keep the customer informed and the truck manifest accurate',
      'Valid driver’s license and a clean driving record required',
    ],
    where: 'Based at Irondale',
  },
  {
    slug: 'delivery-helper',
    title: 'Delivery Helper',
    blurb:
      'The second half of the delivery crew. A good helper is what makes a delivery feel easy to the customer — and it is the usual route to a driver seat.',
    duties: [
      'Load and unload the truck, protect doorways and floors',
      'Carry, place and assemble furniture in the home',
      'Comfortable lifting heavy items with a partner, all day',
      'No license required',
    ],
    where: 'Based at Irondale',
  },
  {
    slug: 'warehouse-associate',
    title: 'Warehouse Associate',
    blurb:
      'Keep the warehouse honest. Everything we sell passes through here, and whether a delivery goes right tomorrow is mostly decided by how carefully it was received and staged today.',
    duties: [
      'Receive incoming shipments and check them against the purchase order',
      'Put stock away, keep bin locations accurate, pull and stage orders',
      'Help with customer pickups at the counter',
      'Cycle counts and keeping the floor clean and navigable',
    ],
    where: 'Irondale',
  },
  {
    slug: 'office-administrator',
    title: 'Office Administrator',
    blurb:
      'The person who keeps the days from colliding. Scheduling, customer calls, and the paperwork behind every order that has already been sold.',
    duties: [
      'Schedule and confirm deliveries, and reschedule them when life happens',
      'Answer customer calls about orders, delivery dates and service issues',
      'Keep order and customer records straight in our system',
      'Comfortable on a computer and on the phone with people all day',
    ],
    where: 'Hoover or Irondale',
  },
];

// schema.org JobPosting, so these show up in Google Jobs — for a small local
// employer that is the most valuable thing on the page.
//
// Only fields we can state truthfully. No baseSalary and no employmentType:
// both are RECOMMENDED rather than required, and a guessed salary range on a
// real job posting is a lie with legal edges on it.
//
// `directApply` became TRUE when the form landed the same day. It is a claim
// Google checks — it means "a candidate can complete an application on this
// page without being sent elsewhere" — and it was correctly false for the few
// hours this page carried only an email address.
const jobsLd = ROLES.map((r) => ({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: r.title,
  description: `${r.blurb} Responsibilities: ${r.duties.join('; ')}.`,
  datePosted: POSTED,
  directApply: true,
  hiringOrganization: {
    '@type': 'Organization',
    name: SITE_NAME,
    sameAs: SITE_URL,
    logo: `${SITE_URL}/opengraph-image`,
  },
  jobLocation: SHOWROOMS.map((s) => ({
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.street,
      addressLocality: s.city,
      addressRegion: s.state,
      postalCode: s.zip,
      addressCountry: 'US',
    },
  })),
}));

export default function CareersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd id="ld-careers" data={jobsLd} />

      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center mb-14">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal mb-4">
          We&apos;re Hiring
        </h1>
        <p className="text-lg text-brand-charcoal-light leading-relaxed">
          Flipsies is a local, family-run furniture business with showrooms in Hoover and
          Irondale. We are looking for people who like working with customers and take pride
          in doing the job properly — experience in furniture is welcome but not required.
        </p>
      </div>

      {/* Open roles */}
      <h2 className="text-2xl font-bold text-brand-charcoal mb-6">Open Positions</h2>
      <div className="grid gap-6 lg:grid-cols-2 mb-16">
        {ROLES.map((r) => (
          <div key={r.slug} className="bg-brand-warm-gray rounded-xl p-6 flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
              <h3 className="text-lg font-semibold text-brand-charcoal">{r.title}</h3>
              <span className="text-xs font-medium text-brand-charcoal-light">{r.where}</span>
            </div>
            <p className="text-sm text-brand-charcoal-light leading-relaxed mb-4">{r.blurb}</p>
            <ul className="text-sm text-brand-charcoal-light space-y-1.5 list-disc pl-5">
              {r.duties.map((d) => (
                <li key={d} className="leading-relaxed">{d}</li>
              ))}
            </ul>
            {/* A plain in-page anchor, so it works before hydration and needs no
                JavaScript at all. It does not preselect the dropdown — see the
                header of JobApplicationForm for why that costs more than it is
                worth on a static page. */}
            <a
              href="#apply"
              className="mt-4 self-start text-sm font-semibold text-brand-charcoal hover:underline"
            >
              Apply for this role →
            </a>
          </div>
        ))}
      </div>

      {/* The form. Email, phone and walking in stay on the page below it — the
          crew roles in particular get filled by someone who will never fill in a
          web form, and hiding the phone number narrows the funnel. */}
      <div className="mb-16">
        <JobApplicationForm roles={ROLES.map((r) => ({ slug: r.slug, title: r.title }))} />
      </div>

      {/* How to apply */}
      <div className="bg-brand-charcoal text-white rounded-2xl p-8 sm:p-12 mb-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Prefer Not to Use the Form?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Then don&apos;t. Email us, call a showroom, or simply come by during opening hours and
            ask for a manager — tell us which role you are interested in and a bit about yourself.
            It carries exactly the same weight as the form above.
          </p>
          <a
            href={`mailto:${STORE_EMAIL}?subject=${encodeURIComponent('Job application')}`}
            className="btn-brand"
          >
            Email Us
          </a>
        </div>
      </div>

      {/* Where to find us — addresses and hours from lib/site.ts, never retyped */}
      <div className="grid gap-6 sm:grid-cols-2 mb-12">
        {SHOWROOMS.map((s) => (
          <div key={s.slug} className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-brand-charcoal mb-2">{s.name}</h3>
            <p className="text-sm text-brand-charcoal-light leading-relaxed">
              {s.street}
              <br />
              {s.city}, {s.state} {s.zip}
            </p>
            <p className="mt-3 text-sm">
              <a href={`tel:${s.phone.replace(/\D/g, '')}`} className="font-medium text-brand-charcoal hover:underline">
                {s.phone}
              </a>
            </p>
          </div>
        ))}
      </div>

      <div className="text-center mb-16">
        <h3 className="font-semibold text-brand-charcoal mb-2">Showroom Hours</h3>
        {HOURS_DISPLAY.map((h) => (
          <p key={h.days} className="text-sm text-brand-charcoal-light">
            <span className="font-medium">{h.days}</span> · {h.time}
          </p>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <p className="text-brand-charcoal-light mb-6">
          Want to know more about us before you apply?
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/about-us" className="btn-outline">About Flipsies</Link>
          <Link href="/locations" className="btn-outline">Our Showrooms</Link>
        </div>
      </div>
    </div>
  );
}
