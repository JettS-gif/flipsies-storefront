import type { Metadata } from 'next';

// /cart is already Disallowed in robots.ts, so this exists to stop the tab
// showing the 55-character site-default title. noindex is belt-and-braces for
// anyone linking straight to it.
export const metadata: Metadata = {
  title: 'Your Cart',
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
