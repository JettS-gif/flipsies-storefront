'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CartButton() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="relative p-2 hover:bg-brand-warm-gray rounded-lg transition-colors"
      aria-label={`Cart with ${itemCount} items`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-brand-yellow-dark rounded-full px-1">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
