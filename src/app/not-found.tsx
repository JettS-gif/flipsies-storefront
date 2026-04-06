import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="text-6xl mb-6">🛋</div>
      <h1 className="text-3xl font-bold text-brand-charcoal mb-4">Page Not Found</h1>
      <p className="text-brand-charcoal-light mb-8 max-w-md mx-auto">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/" className="btn-brand">Go Home</Link>
        <Link href="/shop" className="btn-outline">Browse Products</Link>
      </div>
    </div>
  );
}
