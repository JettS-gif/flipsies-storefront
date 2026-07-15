import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  const title = `${decoded} — Shop`;
  const description = `Browse ${decoded} at Flipsies Furniture. Quality furniture at honest prices.`;
  const path = `/shop/${encodeURIComponent(decoded)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, title, description },
    twitter: { title, description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);

  // Sectionals aren't browsed as individual-piece tiles — send to the builder.
  if (decoded === 'Sectional') redirect('/sectionals');

  const catHref = (c: string) => (c === 'Sectional' ? '/sectionals' : `/shop/${encodeURIComponent(c)}`);

  let products: import('@/lib/api').Product[] = [];
  let categories: string[] = [];
  let count = 0;

  try {
    const [prodRes, catRes] = await Promise.all([
      api.getProducts({ category: decoded, limit: 48 }),
      api.getCategories(),
    ]);
    products = prodRes.data || [];
    count = prodRes.count || 0;
    categories = catRes.categories || [];
  } catch (e) {
    console.error('Failed to load products:', e);
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: `${SITE_URL}/shop` },
      { '@type': 'ListItem', position: 2, name: decoded, item: `${SITE_URL}/shop/${encodeURIComponent(decoded)}` },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd data={breadcrumbLd} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-6">
        <Link href="/shop" className="hover:text-brand-charcoal transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-brand-charcoal font-medium">{decoded}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-charcoal">{decoded}</h1>
        <p className="text-brand-charcoal-light mt-1">
          {count} product{count !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-4">Categories</h2>
          <nav className="space-y-1">
            <Link href="/shop"
              className="block px-3 py-2 text-sm text-brand-charcoal-light hover:text-brand-charcoal
                hover:bg-brand-warm-gray rounded-lg transition-colors">
              All Products
            </Link>
            {categories.map(cat => (
              <Link key={cat} href={catHref(cat)}
                className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                  cat === decoded
                    ? 'font-medium text-brand-charcoal bg-brand-warm-gray'
                    : 'text-brand-charcoal-light hover:text-brand-charcoal hover:bg-brand-warm-gray'
                }`}>
                {cat}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {/* Mobile category pills */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 -mx-1 px-1">
            <Link href="/shop"
              className="shrink-0 px-4 py-2 rounded-full text-xs font-medium border border-brand-border
                text-brand-charcoal-light hover:border-brand-yellow transition-colors">
              All
            </Link>
            {categories.map(cat => (
              <Link key={cat} href={catHref(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  cat === decoded
                    ? 'bg-brand-charcoal text-white'
                    : 'border border-brand-border text-brand-charcoal-light hover:border-brand-yellow'
                }`}>
                {cat}
              </Link>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 text-brand-charcoal-light">
              <div className="text-4xl mb-4">📦</div>
              <p>No products in this category yet.</p>
              <Link href="/shop" className="text-brand-yellow-dark hover:underline mt-2 inline-block">
                Browse all products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
