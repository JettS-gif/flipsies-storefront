import Link from 'next/link';
import { huntIsOpen } from '@/lib/bedDeals';

// Home-page band for the 2026-11-21 radio scavenger hunt. Disappears on its own once
// the hunt closes; delete it with the rest of the hunt code after the event.
export default function HuntBanner() {
  if (!huntIsOpen()) return null;
  return (
    <section className="bg-brand-charcoal text-white border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow">Saturday, Nov 21 · 12–4 pm · Hoover &amp; Irondale</p>
          <p className="text-2xl font-extrabold">The $2,000 Radio Scavenger Hunt</p>
          <p className="text-sm text-gray-300">
            Listen for four clues, solve them in our stores, win $2,000. Free to play, and you must sign up to win.{' '}
            <Link href="/hunt/rules" className="underline hover:text-brand-yellow">Official rules</Link>
          </p>
        </div>
        <Link href="/hunt" className="btn-brand !py-4 !px-8 whitespace-nowrap">
          Sign up free
        </Link>
      </div>
    </section>
  );
}
