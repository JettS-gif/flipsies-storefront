// ── Customer-facing order labels + formatters (Phase 1/2) ─────────────────────
//
// Single source for turning raw backend enums into customer-friendly strings
// across the account order list and detail views. The backend returns raw
// status values (consistent with the rest of the portal); labeling lives here.

/** Invoice status → friendly label. */
const INVOICE_STATUS_LABELS: Record<string, string> = {
  active:              'In progress',
  layaway:             'Layaway',
  paid:                'Paid',
  partial:             'Partially paid',
  en_route:            'Out for delivery',
  partially_fulfilled: 'Partially delivered',
  delivered:           'Delivered',
  issue:               'Needs attention',
  cancelled:           'Cancelled',
  partially_returned:  'Partially returned',
  returned:            'Returned',
};

/** invoice_items.fulfillment_status → friendly label. */
const FULFILLMENT_LABELS: Record<string, string> = {
  pending:       'Pending',
  on_hold:       'On hold',
  needs_ordered: 'Being ordered',
  ordered:       'On order',
  scheduled:     'Scheduled for delivery',
  delivered:     'Delivered',
  layaway:       'Layaway',
};

/** orders.status (the physical delivery/pickup run) → friendly label. */
const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending:           'Being prepared',
  scheduled:         'Scheduled',
  transit:           'Out for delivery',
  delivered:         'Delivered',
  issue:             'Needs attention',
  cancelled:         'Cancelled',
  awaiting_transfer: 'In transit to store',
  ready_for_pickup:  'Ready for pickup',
  picked_up:         'Picked up',
};

function titleize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Any unknown enum falls through to a title-cased default so a new backend
 *  value never renders as a raw token. */
export function statusLabel(s: string | null | undefined): string {
  if (!s) return '';
  return INVOICE_STATUS_LABELS[s] || titleize(s);
}
export function fulfillmentLabel(s: string | null | undefined): string {
  if (!s) return '';
  return FULFILLMENT_LABELS[s] || titleize(s);
}
export function deliveryStatusLabel(s: string | null | undefined): string {
  if (!s) return '';
  return DELIVERY_STATUS_LABELS[s] || titleize(s);
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function orderDate(ds: string | null | undefined): string {
  if (!ds) return '';
  const d = new Date(ds);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
