'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Site-wide strip for the 2026-11-21 radio scavenger hunt (Jett: visitors who land anywhere on the
// site, not just the home page, should hear about it). Decided in the browser from the real clock,
// because many pages are statically cached and a server-rendered strip would outlive the hunt.
// Hidden on the hunt pages themselves. Delete after the event.
const OPENS = Date.UTC(2026, 10, 21, 18, 5, 0);   // 12:05 CST
const CLOSES = Date.UTC(2026, 10, 21, 22, 0, 0);  // 4:00 CST

export default function HuntTopBar() {
  const pathname = usePathname() || '';
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (now === null || now >= CLOSES || pathname.startsWith('/hunt')) return null;
  const live = now >= OPENS;
  return (
    <Link
      href="/hunt?utm_source=site&utm_medium=topbar&utm_campaign=radio_hunt"
      className="block bg-brand-yellow text-brand-charcoal text-center text-sm sm:text-base font-semibold px-4 py-2 hover:brightness-95"
    >
      {live ? (
        <>🔐 The $2,000 Radio Scavenger Hunt is <b>LIVE now</b> until 4:00 · Hoover &amp; Irondale · <span className="underline">Play free →</span></>
      ) : (
        <>🔐 Today: the $2,000 Radio Scavenger Hunt starts at 12:05 · <span className="underline">Sign up free →</span></>
      )}
    </Link>
  );
}
