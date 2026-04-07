'use client';

import { useState } from 'react';
import { useCart, type CartItem } from '@/context/CartContext';

interface Props {
  product: {
    id: string;
    sku: string;
    name: string;
    collection: string | null;
    color: string | null;
    retail_price: number;
    image_url?: string | null;
    category: string | null;
  };
}

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const displayName =
    [product.collection, product.color].filter(Boolean).join(' — ') || product.name;

  function handleAdd() {
    const item: Omit<CartItem, 'qty'> = {
      product_id: product.id,
      sku: product.sku,
      name: displayName,
      price: product.retail_price,
      image_url: product.image_url ?? null,
      category: product.category,
    };
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button onClick={handleAdd} className="btn-brand text-base px-8 py-3 min-w-[160px]">
      {added ? 'Added!' : 'Add to Cart'}
    </button>
  );
}
