// Checkout counts as a Google lead conversion — but only for Google traffic.
//
// Owner decision (Jett, 2026-10-08): a shopper who enters their details at
// checkout is a lead "if they are Google sourced". generate_lead is a PRIMARY
// Google Ads conversion, so firing it for every checkout would credit Ads with
// direct, Meta and organic-Bing shoppers too; firing it for none left the ads
// blind to the most committed leads we get.
//
// THE LANDING PAGE IS THE ONLY PLACE THE SOURCE IS VISIBLE. gclid / utm_* sit on
// the landing URL and document.referrer is only external on the first page;
// by /checkout both say "flipsies.com". So the source is snapshotted per
// session (rememberLandingSource, called on every route change from
// Analytics.tsx) and read back at checkout.
//
// siteEvents.ts keeps its own fs_utm for the first-party beacon, but it does
// not know gbraid/wbraid (iOS app/web Google clicks carry those INSTEAD of a
// gclid) and does not keep the landing referrer, so it cannot answer this on
// its own. It is still consulted as a fallback.
//
// NO PII. The event carries no email, phone or name — the privacy policy and
// the A2P 10DLC clause forbid sending customer contact data to ad platforms
// (memory deliverdesk-privacy-policy-blocks-ad-data-sharing). Click ids are
// not blocked by that, and are not sent here anyway; gtag reads them itself.
//
// NO META. analytics.ts maps generate_lead to Meta "Lead" for the other lead
// surfaces; this one opts out, since the rule is about Google.
//
// Every storage touch is try/catch: this runs on the money path.

import { trackEvent } from './analytics';

const SOURCE_KEY = 'fs_lead_src';
const FIRED_KEY = 'fs_ck_lead_ga';
const SITE_UTM_KEY = 'fs_utm'; // owned by siteEvents.ts

const GOOGLE_CLICK_IDS = ['gclid', 'gbraid', 'wbraid'] as const;

export interface VisitSource {
  /** Google click ids seen on the landing URL this session. */
  clickIds?: string[];
  utmSource?: string | null;
  /** The external referrer of the landing page, if any. */
  referrer?: string | null;
}

/** True for google.com, www.google.co.uk, google.de … — not googleadservices etc. */
function isGoogleHost(referrer: string): boolean {
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return false;
  }
  // google.<tld> or google.<sld>.<tld>, optionally under a subdomain.
  return /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
}

/**
 * THE rule. A visit is Google-sourced when any of:
 *   - a Google click id (gclid / gbraid / wbraid) was on a landing URL this session
 *   - utm_source is "google" (case-insensitive)
 *   - the landing referrer is a google.* domain
 */
export function isGoogleSourced(src: VisitSource | null | undefined): boolean {
  if (!src) return false;
  if (src.clickIds?.some((id) => (GOOGLE_CLICK_IDS as readonly string[]).includes(id))) return true;
  if (typeof src.utmSource === 'string' && src.utmSource.trim().toLowerCase() === 'google') return true;
  if (typeof src.referrer === 'string' && src.referrer && isGoogleHost(src.referrer)) return true;
  return false;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Snapshot the visit source for this session. Called on every route change;
 * only a page that carries a signal (click id, utm_source, external referrer)
 * writes, so in-app navigations never erase the landing source. A fresh
 * signal — a second ad click in the same tab — replaces the old one.
 */
export function rememberLandingSource(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const clickIds = GOOGLE_CLICK_IDS.filter((k) => params.get(k));
    const utmSource = params.get('utm_source');
    let referrer: string | null = null;
    try {
      const ref = document.referrer;
      if (ref && new URL(ref).host !== window.location.host) referrer = ref.slice(0, 300);
    } catch {
      /* unparseable referrer — treat as none */
    }
    // A tagged URL is a deliberate landing and always wins. A referrer alone
    // only fills an empty slot: document.referrer does NOT change on SPA
    // navigations, so it would otherwise overwrite a gclid snapshot with a
    // bare referrer on every in-app route change.
    if (!clickIds.length && !utmSource) {
      if (!referrer || window.sessionStorage.getItem(SOURCE_KEY)) return;
    }
    const snap: VisitSource = { clickIds, utmSource: utmSource ? utmSource.slice(0, 200) : null, referrer };
    window.sessionStorage.setItem(SOURCE_KEY, JSON.stringify(snap));
  } catch {
    /* storage blocked — degrade to "not Google-sourced" */
  }
}

/** This session's source: the landing snapshot, else siteEvents' utm_source. */
export function sessionVisitSource(): VisitSource | null {
  if (typeof window === 'undefined') return null;
  const snap = readJson<VisitSource>(SOURCE_KEY);
  if (snap && isGoogleSourced(snap)) return snap;
  const site = readJson<{ utm_source?: string }>(SITE_UTM_KEY);
  if (site?.utm_source) return { ...(snap || {}), utmSource: site.utm_source };
  return snap;
}

/**
 * Fire GA4 generate_lead for a checkout lead — at most once per browser
 * session, and only for Google-sourced visits. Call after the checkout lead
 * capture SUCCEEDS. Never throws. Returns whether it fired (for tests).
 */
export function checkoutLeadCaptured(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.sessionStorage.getItem(FIRED_KEY)) return false;
    if (!isGoogleSourced(sessionVisitSource())) return false;
    // Set the guard BEFORE firing: if the write throws (storage blocked) we
    // land in the catch and do not fire, rather than firing once per blur.
    window.sessionStorage.setItem(FIRED_KEY, '1');
    trackEvent('generate_lead', { source: 'checkout', method: 'checkout' }, { meta: false });
    return true;
  } catch {
    return false;
  }
}
