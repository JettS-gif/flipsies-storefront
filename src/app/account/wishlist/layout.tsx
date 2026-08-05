import type { Metadata } from 'next';

// Title only — `robots: noindex` is inherited from the parent account layout.
export const metadata: Metadata = {
  title: 'Your Wishlist',
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
