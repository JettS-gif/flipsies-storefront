import Link from 'next/link';
import { pageMetadata } from '@/lib/site';

// Official rules for the 2026-11-21 radio scavenger hunt. Keep in step with the backend's
// utils/scavengerHunt.js (step times, the 4:00 close) and its HUNT.rulesVersion, which is
// stamped on every sign-up as the version the player agreed to.

export const metadata = {
  ...pageMetadata({
    title: 'Scavenger Hunt Official Rules',
    description: 'Official rules for the Flipsies Furniture $2,000 Radio Scavenger Hunt, November 21, 2026.',
    path: '/hunt/rules',
  }),
  robots: { index: false, follow: true },
};

const LAST_UPDATED = 'November 17, 2026';
const STORE_PHONE = '(205) 238-5076';

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">{children}</h2>
);

export default function HuntRulesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-brand-charcoal">$2,000 Radio Scavenger Hunt: Official Rules</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="space-y-4 text-brand-charcoal-light leading-relaxed">
        <p className="font-semibold text-brand-charcoal">
          NO PURCHASE NECESSARY TO ENTER OR WIN. A purchase does not improve your chances of winning. This is a
          game of skill, not a sweepstakes: the winner is decided by solving the puzzles, never by a random drawing.
        </p>

        <H>1. Sponsor</H>
        <p>
          The hunt is run by Flipsies Furniture (&quot;Flipsies&quot;), 1709 Montgomery Hwy S, Hoover, AL 35244 and
          1811 Crestwood Blvd, Irondale, AL 35210. The participating radio stations are not sponsors and are not
          responsible for the hunt.
        </p>

        <H>2. When</H>
        <p>
          The hunt takes place on Saturday, November 21, 2026, from 12:05 pm to 4:00 pm Central Time. All times in
          these rules are Central Time, and the clock on flipsiesfurniture.com is the official clock of the hunt.
        </p>

        <H>3. Who can play</H>
        <p>
          You must be 18 or older and a legal resident of the United States. Employees of Flipsies and of the
          participating radio stations, and the members of their households, may not play. One entry per person:
          each player registers once, with their own mobile number.
        </p>

        <H>4. How to enter</H>
        <p>
          Register free at <Link href="/hunt" className="underline">flipsiesfurniture.com/hunt</Link> with your name
          as it appears on your photo ID, your mobile number and, if you like, your email address. Registration
          opens November 17, 2026 and closes at 4:00 pm on November 21, 2026. You must be registered to win.
        </p>

        <H>5. How to play</H>
        <p>
          Four clues are read on the radio: at about 12:05 pm and 1:00 pm during the broadcast from our Hoover store,
          and at about 2:30 pm and 3:30 pm during the broadcast from our Irondale store. Each clue leads to a station
          in one of our stores, where you will find the information needed for an answer. Stations in each store hand
          out a serial-numbered card (Cards A, B and C) and stamp your passport, one card per player per station.
        </p>
        <p>
          Enter each answer on flipsiesfurniture.com/hunt as you solve it. Answers must be entered in order, and each
          answer box opens when its clue airs. Answers entered before a clue airs or after 4:00 pm are not accepted.
          To keep the game fair, too many wrong answers in a row will pause that answer box for a few minutes.
        </p>

        <H>6. How the winner is decided</H>
        <p>
          The potential winner is the first registered player to enter all four correct answers on
          flipsiesfurniture.com/hunt, as recorded by our system&apos;s timestamps. To be confirmed as the winner, that
          player must then go to the Vault Keeper at the final station in our Irondale store by 4:30 pm and show:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>the original, physical Cards A, B and C (photos or copies are not accepted);</li>
          <li>a passport stamped in both stores; and</li>
          <li>a valid government-issued photo ID that matches the registered name.</li>
        </ul>
        <p>
          If the first finisher cannot be verified, the next finisher in timestamp order is offered the chance to
          verify, and so on. If no player enters all four answers by 4:00 pm, the prize goes to the verified player
          who entered the most correct answers, with the earliest time for their last correct answer breaking any tie.
        </p>

        <H>7. Prize</H>
        <p>
          One prize of $2,000. The winner must complete an IRS Form W-9 before the prize is paid. Flipsies will report
          the prize on Form 1099, and the winner is responsible for any taxes. The prize cannot be transferred.
        </p>

        <H>8. Playing safely and fairly</H>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nothing is hidden in, under or behind furniture. Never move, open or climb on merchandise.</li>
          <li>Obey all traffic laws. Clue 3 cannot be solved before it airs at 2:30 pm, so there is no reason to rush.</li>
          <li>Vault Keepers will re-read a station sign but give no other hints.</li>
          <li>
            Flipsies may disqualify anyone who registers more than once, uses someone else&apos;s cards or entry,
            tampers with the website, disrupts our stores or other players, or otherwise acts unfairly. The
            decisions of Flipsies on all matters relating to the hunt are final.
          </li>
        </ul>

        <H>9. Your information</H>
        <p>
          We use your registration details to run the hunt, verify and contact the winner, and keep a record of the
          event. We send you marketing messages only if you tick the optional box at sign-up, and you can opt out at
          any time. We do not sell your information. See our <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>

        <H>10. Publicity</H>
        <p>
          By accepting the prize, the winner agrees that Flipsies and the participating radio stations may announce
          their first name and city on air and online, unless prohibited by law.
        </p>

        <H>11. General</H>
        <p>
          By taking part, players agree to these rules and release Flipsies and the participating radio stations from
          any claim arising from the hunt, except where the law does not allow it. If the hunt cannot run as planned
          for reasons outside our control, including technical failures, Flipsies may modify, suspend or end it, and
          will award the prize as fairly as possible under these rules. Void where prohibited.
        </p>

        <H>12. Questions</H>
        <p>Call us at {STORE_PHONE} or ask at either store.</p>
      </div>
    </div>
  );
}
