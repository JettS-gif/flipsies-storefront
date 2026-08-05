import { FIT_CHECK } from '@/lib/policy';

// The highest-volume return is not abuse — it is someone who bought without
// measuring and discovers days later that the piece is too big. Dozens of them
// (Jett, 2026-08-05).
//
// This is a NUDGE, not a fix, and the comment should not pretend otherwise: the
// same thing happens on the showroom floor, with a tape measure in reach and a
// salesperson reading the dimensions aloud. Publishing measurements removes the
// excuse; it does not create the habit. The restocking tiers are what actually
// price this behaviour, and an acknowledgement at checkout would do more than
// any amount of information here.
//
// It still earns its place: it asks the question at the only moment the answer
// can change anything, and when we have no dimensions — 57% of the catalog — it
// says so and points at the showroom rather than letting someone guess.
export default function FitCheck({ dimensions }: { dimensions?: string | null }) {
  const dims = (dimensions || '').trim();
  return (
    <div className="mt-4 rounded-xl border border-brand-border bg-white p-4">
      <h3 className="text-sm font-semibold text-brand-charcoal">{FIT_CHECK.heading}</h3>
      {dims ? (
        <p className="mt-1 text-sm text-brand-charcoal">
          This piece is <strong>{dims}</strong>. Check it against:
        </p>
      ) : (
        <p className="mt-1 text-sm text-brand-charcoal-light">
          We do not have measurements published for this piece yet — call either showroom and we will
          measure it for you before you order. Worth doing, because it is the single most common reason
          something comes back. Check:
        </p>
      )}
      <ul className="mt-2 space-y-1.5">
        {FIT_CHECK.points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-brand-charcoal-light">
            <span aria-hidden="true" className="text-brand-yellow-dark mt-0.5 shrink-0">•</span>
            <span className="leading-5">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
