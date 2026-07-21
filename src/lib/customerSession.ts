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
