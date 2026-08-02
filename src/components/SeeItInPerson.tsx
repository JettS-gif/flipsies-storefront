import Link from 'next/link';
import { SHOWROOMS, HOURS_DISPLAY, type Showroom } from '@/lib/site';

// "Where can I see this in person?"
//
// The backend answers this from the bin data: a product with qty > 0 at a
// location of type='showroom' is out of box on display (Jett 2026-08-02 — "if
// it's binned at either showroom it is out of box on display"). Reserved units
// count, because a sold floor model keeps standing there with a SOLD tag and
// someone who drives out to sit on it has had a successful trip.
//
// WHY THIS MATTERS ON A FURNITURE SITE. "I want to try it first" is the single
// biggest objection to buying a sofa online, and until now a shopper looking at
// a $2,000 piece had no way to know they could sit on it fifteen minutes away.
// There are ~1,000 pieces on the Hoover floor and ~1,200 in Irondale, and 94% of
// floor items are published — so for most products this block has something to
// say.
//
// Renders NOTHING when the list is empty. An absent block is honest; a "not
// available to view" message would be a discouraging answer to a question the
// shopper never asked.

// The backend sends the location's own name ("Hoover Showroom"), which is
// warehouse-side nomenclature. Matched to the customer-facing SHOWROOMS entry by
// slug rather than by string equality, so renaming a location in DeliverDesk
// cannot silently blank this block.
function matchShowroom(backendName: string): Showroom | null {
  const n = backendName.toLowerCase();
  return SHOWROOMS.find((s) => n.includes(s.slug)) || null;
}

interface Props {
  onDisplayAt?: Array<{ id: string; name: string }> | null;
}

export default function SeeItInPerson({ onDisplayAt }: Props) {
  const matched = (onDisplayAt || [])
    .map((s) => matchShowroom(s.name))
    .filter((s): s is Showroom => Boolean(s));

  if (!matched.length) return null;

  const both = matched.length > 1;

  return (
    <section className="mt-8 rounded-lg border border-brand-border bg-brand-warm-gray/40 p-5">
      <h2 className="text-base font-semibold text-brand-charcoal">
        See it in person
      </h2>
      <p className="mt-1 text-sm text-brand-charcoal-light">
        {both
          ? 'This piece is on the floor at both of our showrooms.'
          : `This piece is on the floor at our ${matched[0].city} showroom.`}
      </p>

      <div className={`mt-4 grid gap-4 ${both ? 'sm:grid-cols-2' : ''}`}>
        {matched.map((s) => (
          <div key={s.slug} className="rounded-md border border-brand-border bg-white p-4">
            <div className="font-medium text-brand-charcoal">{s.city}</div>
            <address className="mt-1 not-italic text-sm text-brand-charcoal-light">
              {s.street}
              <br />
              {s.city}, {s.state} {s.zip}
            </address>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <a href={s.mapUrl} target="_blank" rel="noopener noreferrer"
                 className="text-brand-green underline underline-offset-2">
                Directions
              </a>
              {/* tel: rather than plain text — most of this traffic is mobile
                  (57% at time of writing), and the whole point of this block is
                  to convert a browser into a visit or a call. */}
              <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}
                 className="text-brand-green underline underline-offset-2">
                {s.phone}
              </a>
              <Link href={`/locations/${s.slug}`}
                    className="text-brand-charcoal-light underline underline-offset-2">
                Store details
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-brand-charcoal-light">
        {HOURS_DISPLAY.map((h) => (
          <div key={h.days}>
            {h.days}: {h.time}
          </div>
        ))}
        {/* Deliberately worded as an invitation, not a guarantee. Floor stock
            moves during the day and the bin data is only as fresh as the last
            person to update it — so "call ahead" is both honest and the action
            we actually want. */}
        <p className="mt-2">
          Floor models move — give us a call before you drive out and we&apos;ll make sure it&apos;s ready for you.
        </p>
      </div>
    </section>
  );
}
