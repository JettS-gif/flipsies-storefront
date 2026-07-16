'use client';

import { useState } from 'react';
import { useCart, type CartItem } from '@/context/CartContext';

// Adds a whole package as ONE cart line. The line carries package_id and the
// bundle price; the backend re-derives that price and expands the package into
// component invoice_items at checkout, so nothing here is trusted for money —
// price is display only, same contract as AddToCartButton.
export default function AddPackageToCartButton({
  pkg,
}: {
  pkg: {
    id: string;
    sku: string | null;
    name: string;
    price: number;
    images: string[];
    category: string | null;
  };
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const item: Omit<CartItem, 'qty'> = {
      package_id: pkg.id,
      sku: pkg.sku || '',
      name: pkg.name,
      price: pkg.price,
      image_url: pkg.images?.[0] ?? null,
      category: pkg.category,
    };
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full mt-6 py-3 rounded-lg font-semibold text-sm transition-colors ${
        added
          ? 'bg-brand-green text-white'
          : 'bg-brand-charcoal text-white hover:bg-brand-yellow hover:text-brand-charcoal'
      }`}
    >
      {added ? 'Added to cart ✓' : 'Add set to cart'}
    </button>
  );
}
