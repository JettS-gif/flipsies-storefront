export default function ShopLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="h-8 w-48 bg-brand-warm-gray rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-brand-warm-gray rounded mt-2 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand-border overflow-hidden">
            <div className="aspect-[4/3] bg-brand-warm-gray animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-16 bg-brand-warm-gray rounded animate-pulse" />
              <div className="h-4 w-full bg-brand-warm-gray rounded animate-pulse" />
              <div className="h-5 w-20 bg-brand-warm-gray rounded animate-pulse mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
