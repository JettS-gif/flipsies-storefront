// ── Customer portal session (Phase 0) ─────────────────────────────────────────
//
// Client-side session for the storefront customer portal. Holds the aud:'customer'
// JWT the backend issues at /portal/verify-otp plus a small display profile.
//
// Storage: localStorage, mirroring how the storefront already persists cart
// (`flipsies_cart`) and delivery slot. The token is low-privilege (a customer
// can only read their own orders/status), so localStorage is an acceptable
// Phase-0 tradeoff. HARDENING FOLLOW-UP: move to an httpOnly cookie set via a
// Next route handler so the token isn't reachable from JS (XSS exfil), once the
// portal carries anything more sensitive than read-own-order.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://deliverdesk-backend-production.up.railway.app';

const TOKEN_KEY   = 'flipsies_customer_token';
const PROFILE_KEY = 'flipsies_customer';

export interface CustomerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

// ── Storage helpers (SSR-safe: no-op / null when window is absent) ─────────────
export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getCustomer(): CustomerProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as CustomerProfile; }
  catch { return null; }
}

export function saveCustomerSession(token: string, customer: CustomerProfile) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(customer));
}

export function clearCustomerSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}

export function isSignedIn(): boolean {
  return !!getCustomerToken();
}

// ── Portal auth API ────────────────────────────────────────────────────────────
// Raw fetch (not the shared api.ts request() helper) so callers can branch on
// HTTP status — mirrors staff-login/page.tsx, the established twin of this flow.

export interface RequestOtpResult {
  ok: boolean;
  status: number;
  dev?: boolean;
  /** DEV_MODE only — the backend echoes the code so wire-tests can complete. */
  devCode?: string;
}

export async function portalRequestOtp(phone: string): Promise<RequestOtpResult> {
  const res = await fetch(`${API_BASE}/portal/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, dev: body?.dev, devCode: body?.devCode };
}

export interface VerifyOtpResult {
  ok: boolean;
  status: number;
  token?: string;
  customer?: CustomerProfile;
}

export async function portalVerifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const res = await fetch(`${API_BASE}/portal/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone.replace(/\D/g, ''), code: code.replace(/\D/g, '') }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, token: body?.token, customer: body?.customer };
}

// ── Authed portal data ─────────────────────────────────────────────────────────

/** One row in the unified order history (online + in-store). Mirrors the
 *  backend /portal/orders customer-safe projection — no cost/salesperson. */
export interface OrderCard {
  invoice_number: string;
  date: string;
  status: string;
  channel: 'online' | 'in_store';
  type: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  delivery_mode: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  item_count: number;
  items_preview: string[];
}

export interface OrdersResult {
  ok: boolean;
  /** true when the token was rejected (expired/invalid) — caller should sign out. */
  unauthorized: boolean;
  orders: OrderCard[];
}

export async function portalGetOrders(): Promise<OrdersResult> {
  const token = getCustomerToken();
  if (!token) return { ok: false, unauthorized: true, orders: [] };
  const res = await fetch(`${API_BASE}/portal/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return { ok: false, unauthorized: true, orders: [] };
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, unauthorized: false, orders: Array.isArray(body?.orders) ? body.orders : [] };
}

// ── Order detail + status (Phase 2) ─────────────────────────────────────────────

/** One step in a custom order's production timeline. */
export interface CustomStageStep {
  key: string;
  label: string;
  passed: boolean;
  current: boolean;
}

/** Customer-safe custom-order view — mirrors the backend getPublicCustomOrder. */
export interface CustomOrderView {
  invoice_number: string | null;
  stage: string;
  stage_label: string;
  stage_timeline: CustomStageStep[];
  needed_by: string | null;
  promised_by: string | null;
  cancelled: boolean;
  cancel_reason: string | null;
  payment_pct: number;
  items: { name: string; sku: string | null; qty: number; configuration: unknown }[];
  timeline: { type: string; message: string; created_at: string }[];
}

export interface OrderDetailItem {
  name: string;
  sku: string | null;
  qty: number;
  fulfillment_status: string | null;
  needs_po: boolean;
  is_custom: boolean;
}

export interface OrderDetail {
  invoice_number: string;
  date: string;
  status: string;
  channel: 'online' | 'in_store';
  type: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  delivery: {
    mode: string | null;
    date: string | null;
    time: string | null;
    order_status: string | null;
    order_kind: string | null;
    order_date: string | null;
    order_window: string | null;
  };
  items: OrderDetailItem[];
  custom_orders: CustomOrderView[];
}

export interface OrderDetailResult {
  ok: boolean;
  unauthorized: boolean;
  notFound: boolean;
  order: OrderDetail | null;
}

export async function portalGetOrder(invoiceNumber: string): Promise<OrderDetailResult> {
  const token = getCustomerToken();
  if (!token) return { ok: false, unauthorized: true, notFound: false, order: null };
  const res = await fetch(`${API_BASE}/portal/orders/${encodeURIComponent(invoiceNumber)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return { ok: false, unauthorized: true, notFound: false, order: null };
  if (res.status === 404) return { ok: false, unauthorized: false, notFound: true, order: null };
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, unauthorized: false, notFound: false, order: res.ok ? (body as OrderDetail) : null };
}

// ── Wishlist (Phase 3) ───────────────────────────────────────────────────────────

export interface WishlistItem {
  product_id: string;
  name: string;
  sku: string | null;
  collection: string | null;
  color: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
  in_stock: boolean;
  available: boolean;
  added_at: string;
}

export interface WishlistResult {
  ok: boolean;
  unauthorized: boolean;
  items: WishlistItem[];
}

export async function portalGetWishlist(): Promise<WishlistResult> {
  const token = getCustomerToken();
  if (!token) return { ok: false, unauthorized: true, items: [] };
  const res = await fetch(`${API_BASE}/portal/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return { ok: false, unauthorized: true, items: [] };
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, unauthorized: false, items: Array.isArray(body?.items) ? body.items : [] };
}

/** Result of a wishlist mutation. `unauthorized` means "not signed in / token
 *  rejected" — the caller should route to /account/login. */
export interface WishlistMutationResult {
  ok: boolean;
  unauthorized: boolean;
}

export async function portalAddWishlist(productId: string): Promise<WishlistMutationResult> {
  const token = getCustomerToken();
  if (!token) return { ok: false, unauthorized: true };
  const res = await fetch(`${API_BASE}/portal/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ product_id: productId }),
  });
  if (res.status === 401) return { ok: false, unauthorized: true };
  return { ok: res.ok, unauthorized: false };
}

export async function portalRemoveWishlist(productId: string): Promise<WishlistMutationResult> {
  const token = getCustomerToken();
  if (!token) return { ok: false, unauthorized: true };
  const res = await fetch(`${API_BASE}/portal/wishlist/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return { ok: false, unauthorized: true };
  return { ok: res.ok, unauthorized: false };
}

// ── Persisted cart (Phase 3b) ────────────────────────────────────────────────────
// Cart lines are typed unknown[] here to keep this module decoupled from the
// storefront's CartItem shape — CartContext owns that type and casts.

export async function portalGetCart(): Promise<{ ok: boolean; unauthorized: boolean; cart: unknown[] }> {
  const token = getCustomerToken();
  if (!token) return { ok: false, unauthorized: true, cart: [] };
  const res = await fetch(`${API_BASE}/portal/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return { ok: false, unauthorized: true, cart: [] };
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, unauthorized: false, cart: Array.isArray(body?.cart) ? body.cart : [] };
}

export async function portalPutCart(cart: unknown[]): Promise<{ ok: boolean; unauthorized: boolean }> {
  const token = getCustomerToken();
  if (!token) return { ok: false, unauthorized: true };
  const res = await fetch(`${API_BASE}/portal/cart`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ cart }),
  });
  if (res.status === 401) return { ok: false, unauthorized: true };
  return { ok: res.ok, unauthorized: false };
}
