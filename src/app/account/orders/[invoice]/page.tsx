'use client';

// ── Customer order detail + status (Phase 2) ──────────────────────────────────
//
// Full status for one of the signed-in customer's orders: payment summary,
// delivery progress (invoice + linked delivery-order status), per-line
// fulfillment, and — for custom/special orders — the production timeline and
// customer-visible update feed (backend reuses the Phase-E getPublicCustomOrder).

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  isSignedIn,
  clearCustomerSession,
  portalGetOrder,
  type OrderDetail,
  type CustomOrderView,
} from '@/lib/customerSession';
import {
  statusLabel,
  fulfillmentLabel,
  deliveryStatusLabel,
  money,
  orderDate,
} from '@/lib/orderLabels';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-5 sm:p-6 shadow-sm">
      {children}
    </div>
  );
}

function CustomOrderTimeline({ co }: { co: CustomOrderView }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-brand-charcoal">Custom order status</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          {co.stage_label}
        </span>
      </div>

      {co.cancelled ? (
        <p className="text-sm text-red-700">
          This custom order was cancelled{co.cancel_reason ? `: ${co.cancel_reason}` : '.'}
        </p>
      ) : (
        <ol className="space-y-2">
          {co.stage_timeline.map(step => (
            <li key={step.key} className="flex items-center gap-3">
              <span
                className={
                  'w-2.5 h-2.5 rounded-full shrink-0 ' +
                  (step.current
                    ? 'bg-brand-charcoal ring-2 ring-brand-charcoal/30'
                    : step.passed
                    ? 'bg-brand-charcoal'
                    : 'bg-brand-border')
                }
              />
              <span
                className={
                  'text-sm ' +
                  (step.current
                    ? 'font-semibold text-brand-charcoal'
                    : step.passed
                    ? 'text-brand-charcoal'
                    : 'text-brand-charcoal-light')
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      )}

      {co.promised_by && !co.cancelled && (
        <p className="text-xs text-brand-charcoal-light">
          Estimated ready by {orderDate(co.promised_by)}
        </p>
      )}

      {co.timeline.length > 0 && (
        <div className="border-t border-brand-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-brand-charcoal-light uppercase tracking-wide">Updates</p>
          {co.timeline.map((ev, i) => (
            <div key={i} className="text-sm text-brand-charcoal">
              <span className="text-brand-charcoal-light">{orderDate(ev.created_at)} — </span>
              {ev.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ invoice: string }>();
  const invoiceNumber = Array.isArray(params.invoice) ? params.invoice[0] : params.invoice;

  const [order,    setOrder]    = useState<OrderDetail | null>(null);
  const [state,    setState]    = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading');

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/account/login');
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await portalGetOrder(invoiceNumber);
      if (cancelled) return;
      if (r.unauthorized) {
        clearCustomerSession();
        router.replace('/account/login');
        return;
      }
      if (r.notFound) { setState('notfound'); return; }
      if (!r.ok || !r.order) { setState('error'); return; }
      setOrder(r.order);
      setState('ok');
    })();
    return () => { cancelled = true; };
  }, [router, invoiceNumber]);

  return (
    <div className="bg-brand-warm-gray min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/account" className="text-sm text-brand-charcoal-light hover:text-brand-charcoal underline">
          ← All orders
        </Link>

        {state === 'loading' && (
          <div className="mt-6 text-sm text-brand-charcoal-light">Loading order…</div>
        )}

        {state === 'notfound' && (
          <div className="mt-6"><Card>
            <p className="text-sm text-brand-charcoal">We couldn&apos;t find that order on your account.</p>
          </Card></div>
        )}

        {state === 'error' && (
          <div className="mt-6"><Card>
            <p className="text-sm text-red-700">Something went wrong loading this order. Please try again.</p>
          </Card></div>
        )}

        {state === 'ok' && order && (
          <div className="mt-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-brand-charcoal">{order.invoice_number}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-brand-border text-brand-charcoal-light">
                    {order.channel === 'online' ? 'Online' : 'In-store'}
                  </span>
                  <span className="text-xs text-brand-charcoal-light">{orderDate(order.date)}</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-brand-charcoal text-right shrink-0">
                {statusLabel(order.status)}
              </span>
            </div>

            {/* Payment */}
            <Card>
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-charcoal-light">Order total</span>
                <span className="font-semibold text-brand-charcoal">{money(order.total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-brand-charcoal-light">Paid</span>
                <span className="text-brand-charcoal">{money(order.amount_paid)}</span>
              </div>
              {order.balance_due > 0 && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-brand-charcoal-light">Balance due</span>
                  <span className="font-semibold text-red-700">{money(order.balance_due)}</span>
                </div>
              )}
            </Card>

            {/* Delivery */}
            <Card>
              <p className="text-sm font-semibold text-brand-charcoal mb-2">Delivery</p>
              {order.delivery.order_status ? (
                <p className="text-sm text-brand-charcoal">
                  {deliveryStatusLabel(order.delivery.order_status)}
                  {order.delivery.order_date ? ` — ${orderDate(order.delivery.order_date)}` : ''}
                  {order.delivery.order_window ? ` (${order.delivery.order_window})` : ''}
                </p>
              ) : order.delivery.mode === 'pickup' ? (
                <p className="text-sm text-brand-charcoal">In-store pickup</p>
              ) : order.delivery.date ? (
                <p className="text-sm text-brand-charcoal">
                  Scheduled for {orderDate(order.delivery.date)}
                  {order.delivery.time ? ` (${order.delivery.time})` : ''}
                </p>
              ) : (
                <p className="text-sm text-brand-charcoal-light">
                  We&apos;ll reach out to schedule your delivery.
                </p>
              )}
            </Card>

            {/* Items */}
            <Card>
              <p className="text-sm font-semibold text-brand-charcoal mb-3">Items</p>
              <ul className="space-y-3">
                {order.items.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-brand-charcoal">
                        {it.name}
                        {it.qty > 1 ? <span className="text-brand-charcoal-light"> × {it.qty}</span> : null}
                      </p>
                      {it.is_custom && (
                        <span className="text-xs text-amber-800">Custom / special order</span>
                      )}
                    </div>
                    {it.fulfillment_status && (
                      <span className="text-xs text-brand-charcoal-light text-right shrink-0">
                        {fulfillmentLabel(it.fulfillment_status)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Custom order timelines */}
            {order.custom_orders.map((co, i) => (
              <Card key={i}><CustomOrderTimeline co={co} /></Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
