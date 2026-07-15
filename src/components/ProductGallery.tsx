'use client';

import { useState } from 'react';

// PDP image gallery — main image + clickable thumbnails, driven by the full
// product.images[] array (the PDP previously showed only images[0]). Client
// component for the thumbnail switching; falls back to the "coming soon"
// placeholder when a product has no photos yet.
export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-brand-warm-gray rounded-2xl flex items-center justify-center overflow-hidden p-4">
        <div className="text-center">
          <div className="text-7xl mb-4 opacity-20">🛋</div>
          <p className="text-sm text-brand-charcoal-light opacity-40">Image coming soon</p>
        </div>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      {/* Main image — object-contain + aspect-[4/3] so the full piece shows
          regardless of source orientation, on a warm-gray letterbox. */}
      <div className="aspect-[4/3] bg-brand-warm-gray rounded-2xl flex items-center justify-center overflow-hidden p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={alt} className="max-w-full max-h-full object-contain" />
      </div>

      {/* Thumbnails — only when there's more than one image. */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 bg-white transition-colors ${
                i === active ? 'border-brand-yellow' : 'border-brand-border hover:border-brand-charcoal-light'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
