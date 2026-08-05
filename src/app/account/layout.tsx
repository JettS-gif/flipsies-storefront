import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

// The account pages are client components, which cannot export metadata — hence
// this layout, whose only job is to carry it.
//
// `noindex` rather than a robots.txt Disallow, deliberately: /account and
// /account/wishlist were `index, follow` and absent from robots.txt, so they
// were eligible for the index while rendering nothing but a sign-in prompt to a
// crawler. Disallowing them would stop the crawl but NOT remove a URL already
// indexed from an external link — Google has to be able to fetch the page to
// see the noindex. /cart and /track-order are a different case: already
// Disallowed in robots.ts, so they only need a real title here.
export const metadata: Metadata = {
  // A plain string here would REPLACE the root template for everything nested
  // below, so /account/wishlist would lose its " | Flipsies Furniture" suffix.
  title: {
    default: 'Your Account',
    template: `%s | ${SITE_NAME}`,
  },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
