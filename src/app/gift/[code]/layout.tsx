import type { Metadata } from 'next';

// The page is a client component, so the metadata lives here. noindex: every URL
// under /gift/ carries a real card number, and none belongs in a search index.
export const metadata: Metadata = {
  title: 'Gift Card Balance',
  robots: { index: false, follow: false },
};

export default function GiftCardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
