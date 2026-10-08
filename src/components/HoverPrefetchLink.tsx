'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

// A <Link> that prefetches when someone points at it, not when it scrolls into
// view (the pattern from Next's linking guide, "prefetch only on hover").
//
// Why: the shop grid renders 48 product cards a page, and a default <Link>
// prefetches every one of them as it enters the viewport. Every showroom device
// shares one public IP through the store NAT, and the Vercel firewall caps each
// IP at 300 requests a minute, so a page or two of browsing from the floor
// tripped a 429 (Jett 2026-09-12, again 2026-10-08 paging to shop page 2).
// Touch devices have no hover, so touchstart arms it too: the iPads still get
// the prefetch a beat before the tap lands.
export default function HoverPrefetchLink({
  onMouseEnter, onTouchStart, onFocus, ...props
}: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [armed, setArmed] = useState(false);
  return (
    <Link
      {...props}
      prefetch={armed ? null : false}
      onMouseEnter={(e) => { setArmed(true); onMouseEnter?.(e); }}
      onTouchStart={(e) => { setArmed(true); onTouchStart?.(e); }}
      onFocus={(e) => { setArmed(true); onFocus?.(e); }}
    />
  );
}
