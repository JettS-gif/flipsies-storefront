import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import HuntGame from '@/components/HuntGame';

export const metadata = {
  ...pageMetadata({
    title: '$2,000 Radio Scavenger Hunt',
    description: 'Sign up free for the Flipsies $2,000 radio scavenger hunt, Saturday, November 21, across our Hoover and Irondale stores.',
    path: '/hunt',
  }),
  // Indexable while the hunt is promoted; the page comes down after the event.
  robots: { index: true, follow: true },
};

export default function HuntPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold text-brand-yellow-dark uppercase tracking-wide">Saturday, November 21 · 12–4 pm</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal mt-1">The $2,000 Radio Scavenger Hunt</h1>
        <p className="text-brand-charcoal-light mt-3 leading-relaxed">
          Listen live from our Hoover store (12–2) and our Irondale store (2–4). Four clues air on the radio. Each one
          leads to a station in the store, and each station gives you an answer. Enter your answers here as you
          get them. The first player to enter all four, then show their cards, passport and photo ID to the Vault
          Keeper in Irondale, wins $2,000.
        </p>
        <p className="text-sm text-brand-charcoal-light mt-2">
          No purchase necessary. 18 and over. <Link href="/hunt/rules" className="underline">Official rules</Link>.
        </p>
      </header>

      <HuntGame />

      <section className="mt-12 text-sm text-brand-charcoal-light space-y-1">
        <h2 className="font-semibold text-brand-charcoal">Clue times</h2>
        <p>Clue 1: 12:05 pm and Clue 2: 1:00 pm, on the Hoover broadcast (1709 Montgomery Hwy S).</p>
        <p>Clue 3: 2:30 pm and Clue 4: 3:30 pm, on the Irondale broadcast (1811 Crestwood Blvd).</p>
        <p>Please drive safely between stores. Clue 3 can&apos;t be solved before it airs, so there&apos;s no reason to rush.</p>
      </section>
    </div>
  );
}
