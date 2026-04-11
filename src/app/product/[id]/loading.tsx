export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="h-4 w-48 bg-brand-warm-gray rounded animate-pulse mb-8" />
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="aspect-[4/3] bg-brand-warm-gray rounded-2xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-3 w-24 bg-brand-warm-gray rounded animate-pulse" />
          <div className="h-8 w-72 bg-brand-warm-gray rounded animate-pulse" />
          <div className="h-10 w-40 bg-brand-warm-gray rounded animate-pulse mt-6" />
          <div className="h-4 w-48 bg-brand-warm-gray rounded animate-pulse" />
          <div className="flex gap-3 mt-8">
            <div className="h-12 w-40 bg-brand-warm-gray rounded-lg animate-pulse" />
            <div className="h-12 w-40 bg-brand-warm-gray rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
