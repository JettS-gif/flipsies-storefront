'use client';

import { useRouter } from 'next/navigation';
import type { ProductVariant } from '@/lib/api';

// Color/finish selector for products that have sibling variants (same
// variant_group_id — e.g. a cabinet offered in several colors). A dropdown of
// colors, each labeled with its stock status; choosing one navigates to that
// variant's product page, which renders its own gallery + price. Server already
// dedupes by color and orders in-stock first.
export default function ColorSelector({
  variants,
  currentId,
}: {
  variants: ProductVariant[];
  currentId: string;
}) {
  const router = useRouter();
  if (!variants || variants.length < 2) return null;

  const value = variants.some((v) => v.id === currentId) ? currentId : variants[0].id;

  return (
    <div className="mt-5">
      <label htmlFor="color-select" className="block text-sm font-semibold text-brand-charcoal mb-2">
        Color
      </label>
      <select
        id="color-select"
        value={value}
        onChange={(e) => {
          if (e.target.value !== currentId) router.push(`/product/${e.target.value}`);
        }}
        className="w-full sm:w-72 rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-charcoal focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow"
      >
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {(v.color ?? 'Standard') + (v.in_stock ? ' (in stock)' : ' (needs to be ordered)')}
          </option>
        ))}
      </select>
    </div>
  );
}
