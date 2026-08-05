import type { Metadata } from 'next';

// Already Disallowed in robots.ts; this gives the page a real title and a
// noindex for anyone arriving from a direct link.
export const metadata: Metadata = {
  title: 'Track Your Order',
  robots: { index: false, follow: false },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
