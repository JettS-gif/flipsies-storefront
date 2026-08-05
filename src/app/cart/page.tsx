'use client';

import Link from 'next/link';
import { useCart, cartKey } from '@/context/CartContext';
import { summarizeCartAvailability } from '@/lib/cartAvailability';
import { thumb } from '@/lib/img';

const CATEGORY_EMOJI: Record<string, string> = {
  Sofas: '🛋', Sectionals: '🛋', Chairs: '🪑', Tables: '🪑',
  Beds: '🛏', Mattresses: '🛏', Dressers: '🗄', Desks: '🖥',
};

function fallbackEmoji(category: string | null) {
  if (!category) return '🪑';
  return CATEGORY_EMOJI[category] || '🪑';
}

export default function CartPage() {
  const { items, removeItem, updateQty, subtotal, itemCount } = useCart();

  const taxRate = 0.10; // Estimated — final rate calculated at checkout based on delivery destination
  const estimatedTax = subtotal * taxRate;
  const total = subtotal + estimatedTax;

  // Rule lives in src/lib/cartAvailability.ts so it is unit-tested — same
  // reason checkoutReadiness.ts is not inline here.
  const { inStockLines, mixed: mixedCart, longestLead } = summarizeCartAvailability(items);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6 opacity-20">🛒</div>
        <h1 className="text-2xl font-bold text-brand-charcoal mb-3">Your cart is empty</h1>
        <p className="text-brand-charcoal-light mb-8">
          Browse our collection and add some furniture you love.
        </p>
        <Link href="/shop" className="btn-brand text-base px-8 py-3">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-8">
        Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h1>

      {/* MIXED CART — some now, some made to order.
          The whole order waits on its slowest line, and a customer who only
          learns that at the delivery step goes back to the cart and leaves
          (Barrett Ottoman, 2026-08-04: in-stock sofa alongside a 4-6 week
          ottoman, 71 seconds on checkout, gone). Said here it is a choice
          rather than a surprise.
          Deliberately COPY, not a split-order button. Splitting one cart into
          two fulfilments touches pricing, delivery-fee allocation and the
          oversell guard; the phone call it prompts is worth more than the
          feature is, at least until the volume argues otherwise. */}
      {mixedCart && (
        <div className="mb-6 rounded-lg border border-brand-yellow bg-brand-warm-gray p-4">
          <p className="text-sm font-semibold text-brand-charcoal">
            Part of your order is made to order.
          </p>
          <p className="text-sm text-brand-charcoal-light mt-1">
            {inStockLines} {inStockLines === 1 ? 'item is' : 'items are'} in stock now
            {longestLead ? `, and the rest ships in ${longestLead}` : ', and the rest is made to order'}.
            Ordered together, delivery is scheduled once every piece has arrived — so you
            will not pick a date at checkout.
          </p>
          <p className="text-sm text-brand-charcoal-light mt-2">
            Want the in-stock pieces sooner? Order them now and we will place the rest
            on order — <Link href="/contact" className="text-brand-yellow-dark font-medium hover:underline">call or message us</Link>{' '}
            and we will split it for you.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div
              key={item.product_id}
              className="flex gap-4 p-4 border border-brand-border rounded-lg"
            >
              {/* Image */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-warm-gray rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb(item.image_url, { width: 200 })} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-3xl opacity-20">{fallbackEmoji(item.category)}</span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link
                  href={item.package_id ? `/package/${item.package_id}` : `/product/${item.product_id}`}
                  className="font-medium text-brand-charcoal hover:text-brand-yellow-dark transition-colors line-clamp-2"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-brand-charcoal-light font-mono mt-0.5">
                  SKU: {item.sku}
                </p>
                <p className="text-sm font-semibold text-brand-charcoal mt-2">
                  ${Number(item.price).toFixed(2)}
                </p>

                {/* Per-line availability. `in_stock === false` and not merely
                    falsy: the field is absent on lines added before it shipped,
                    and treating unknown as out-of-stock would put a made-to-order
                    warning on items sitting in the warehouse. */}
                {item.in_stock === false && (
                  <p className="text-xs text-brand-yellow-dark font-medium mt-1">
                    {item.lead_label ? `Made to order — ships in ${item.lead_label}` : 'Made to order'}
                  </p>
                )}
                {item.in_stock === true && (
                  <p className="text-xs text-brand-green font-medium mt-1">In stock now</p>
                )}

                {/* Qty controls */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => updateQty(cartKey(item), item.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-brand-border hover:bg-brand-warm-gray text-sm"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                  <button
                    onClick={() => updateQty(cartKey(item), item.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-brand-border hover:bg-brand-warm-gray text-sm"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(cartKey(item))}
                    className="ml-auto text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Line total */}
              <div className="text-right shrink-0">
                <span className="font-semibold text-brand-charcoal">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="border border-brand-border rounded-lg p-6 sticky top-24">
            <h2 className="font-semibold text-brand-charcoal mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-charcoal-light">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-charcoal-light">Est. Tax</span>
                <span className="font-medium">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-charcoal-light">Delivery</span>
                <span className="text-brand-charcoal-light text-xs">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t border-brand-border mt-4 pt-4 flex justify-between">
              <span className="font-semibold text-brand-charcoal">Estimated Total</span>
              <span className="font-bold text-lg text-brand-charcoal">${total.toFixed(2)}</span>
            </div>

            <Link
              href="/checkout"
              className="btn-brand w-full text-center text-base py-3 mt-6"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/shop"
              className="block text-center text-sm text-brand-charcoal-light hover:text-brand-charcoal mt-3 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
