// First-party behaviour beacon — the half of analytics we own.
//
// Sits ALONGSIDE lib/analytics.ts (GA4 + Meta), it does not replace it. The
// third-party tags answer "how did the ad perform"; this answers "what did
// people look at, what did they search for, and did that visitor buy" — which
// GA4 structurally cannot, because it lives in Google and our invoices live in
// Supabase with no shared key.
//
// The single most valuable thing it captures is a search that returned NOTHING.
// That is a customer naming a product we do not carry, or do not name the way
// they say it, and no third-party tool will ever hand it over joined to our
// own catalog.
//
// EVERY FAILURE HERE IS SILENT AND MUST STAY THAT WAY. This runs on a shopper's
// page. A thrown error, a rejected promise, or a visible console error buys
// nothing — there is no client-side recovery from "we didn't record a page
// view" — and costs a broken-looking site. The backend answers 204 to
// everything for the same reason.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://deliverdesk-backend-production.up.railway.app';

const VISITOR_KEY = 'fs_vid';
const SESSION_KEY = 'fs_sid';
const UTM_KEY = 'fs_utm';

const VISITOR_DAYS = 365;
const SESSION_MINUTES = 30;

export type SiteEventType =
  | 'page_view'
  | 'product_view'
  | 'search'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase';

export interface SiteEventInput {
  event_type: SiteEventType;
  path?: string;
  product_id?: string | null;
  sku?: string | null;
  search_query?: string | null;
  results_count?: number | null;
  payload?: Record<string, unknown> | null;
}

function id(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// localStorage rather than a document.cookie: the id is never sent to a third
// party and never needs to reach the server on a normal request, so there is no
// reason to attach it to every asset fetch.
function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // Safari private mode, or storage disabled — degrade, don't throw
  }
}

function writeStore(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Stable per-browser id. The unique-visitor key, and the join key to invoices. */
export function visitorId(): string {
  const raw = readStore(VISITOR_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { v: string; exp: number };
      if (parsed.v && parsed.exp > Date.now()) return parsed.v;
    } catch {
      /* malformed — reissue below */
    }
  }
  const v = id();
  writeStore(VISITOR_KEY, JSON.stringify({ v, exp: Date.now() + VISITOR_DAYS * 864e5 }));
  return v;
}

/**
 * Rolling 30-minute session. Each event pushes the expiry out.
 *
 * Exported so a lead submission can record the SITTING that produced it, not
 * just the person — the Leads panel wants "what were they looking at when they
 * asked us", which is a session question.
 */
export function sessionId(): string {
  const raw = readStore(SESSION_KEY);
  const now = Date.now();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { v: string; exp: number };
      if (parsed.v && parsed.exp > now) {
        writeStore(SESSION_KEY, JSON.stringify({ v: parsed.v, exp: now + SESSION_MINUTES * 60_000 }));
        return parsed.v;
      }
    } catch {
      /* reissue */
    }
  }
  const v = id();
  writeStore(SESSION_KEY, JSON.stringify({ v, exp: now + SESSION_MINUTES * 60_000 }));
  return v;
}

// UTM lives on the LANDING url only, so it is captured once and carried for the
// rest of the session. Without this, every event after the first would report
// no source and the attribution join would only ever see the entry page.
//
// Read from window.location directly rather than useSearchParams(), which would
// opt the whole tree into dynamic rendering — the same reason Analytics.tsx
// avoids it.
// PAID CLICKS ARRIVE AS gclid, NOT utm. Google Ads auto-tagging — which is the
// recommended setup and the one we enabled — appends `gclid` and NO utm_*
// parameters. Capturing only utm therefore made every auto-tagged ad click look
// identical to organic search: 380 events with zero utm_source, which reads as
// "the ads sent nobody" when it actually means "we never looked".
//
// A click id is recorded as utm_source='google' / utm_medium='cpc' rather than
// stored raw: that groups a paid visit with the rest of the source report
// instead of making every consumer learn a second field, and it answers the
// only question being asked here — paid or organic.
//
// The raw id is deliberately NOT sent. site_events has no column for it, so it
// would be dropped by buildEventRow anyway, and a field that looks captured but
// silently isn't is worse than an absent one. If click-level joins to the Ads
// API are ever wanted, that needs a column and a migration, not a hopeful
// payload key.
//
// Same treatment for Microsoft (msclkid) and Meta (fbclid) — identical problem.
const CLICK_IDS: Array<[string, string, string]> = [
  // [param, utm_source, utm_medium]
  ['gclid',   'google',    'cpc'],
  ['msclkid', 'bing',      'cpc'],
  ['fbclid',  'facebook',  'paid_social'],
];

function utmParams(): Record<string, string> {
  try {
    const stored = window.sessionStorage.getItem(UTM_KEY);
    const current = new URLSearchParams(window.location.search);
    const fresh: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const v = current.get(k);
      if (v) fresh[k] = v.slice(0, 200);
    }
    // Only fills what an explicit utm_* did NOT set — a hand-tagged campaign URL
    // is a deliberate statement about attribution and must win over an inferred
    // one.
    for (const [param, source, medium] of CLICK_IDS) {
      const id = current.get(param);
      if (!id) continue;
      if (!fresh.utm_source) fresh.utm_source = source;
      if (!fresh.utm_medium) fresh.utm_medium = medium;
      break; // one click can only come from one network
    }
    if (Object.keys(fresh).length) {
      window.sessionStorage.setItem(UTM_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Fire an event. Never throws, never rejects, never logs to the console.
 *
 * Uses sendBeacon when available: it survives the page being closed, which
 * matters for begin_checkout and for the last page view of a session — the two
 * events most likely to coincide with a navigation away.
 */
export function track(input: SiteEventInput): void {
  if (typeof window === 'undefined') return;

  try {
    const body = JSON.stringify({
      ...input,
      visitor_id: visitorId(),
      session_id: sessionId(),
      path: input.path ?? window.location.pathname,
      referrer: document.referrer || null,
      ...utmParams(),
    });

    const url = `${API_BASE}/site-event`;

    if (navigator.sendBeacon) {
      // Blob with an explicit type — sendBeacon defaults to text/plain, which
      // express.json() will not parse, and the event would be silently dropped
      // server-side while looking perfectly fine here.
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* analytics must never surface a failure to a shopper */
    });
  } catch {
    /* ditto */
  }
}
