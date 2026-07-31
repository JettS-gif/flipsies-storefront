/**
 * Central-Time date helpers for the storefront.
 *
 * CST INVARIANT (mirrors DeliverDeskBackEnd/utils/time.js): every
 * business-meaningful "date" at Flipsies is the calendar date in
 * America/Chicago. Both showrooms are in Birmingham.
 *
 * The storefront has TWO ways to get this wrong, and they are different from
 * the backend's:
 *
 *   1. SERVER components run on Vercel, in UTC. After 7pm CT the UTC date is
 *      already tomorrow.
 *   2. CLIENT components run in the CUSTOMER's timezone — which is whatever
 *      they happen to be in. A shopper in California and one in Alabama would
 *      compute different "today"s for the same delivery rule.
 *
 * `new Date().toISOString().slice(0, 10)` is wrong in BOTH cases: on the server
 * it is UTC, and in the browser it converts the customer's local time to UTC
 * before slicing. Neither is the store's calendar.
 *
 * Real consequence (2026-07-31): the pickup date picker computed its minimum
 * this way, so a Central customer shopping after 7pm was offered a minimum
 * pickup date a day later than the 48-hour rule actually requires — valid days
 * silently unavailable.
 */

const CT = 'America/Chicago';

/** Today's calendar date in Central, as 'YYYY-MM-DD'. */
export function todayCT(): string {
  // en-CA renders YYYY-MM-DD natively; timeZone pins it regardless of whether
  // this runs on Vercel (UTC) or in a shopper's browser (anywhere).
  return new Date().toLocaleDateString('en-CA', { timeZone: CT });
}

/** Current month in Central, as 'YYYY-MM'. */
export function monthCT(): string {
  return todayCT().slice(0, 7);
}

/**
 * `n` days from today in Central, as 'YYYY-MM-DD'. Negative `n` goes back.
 *
 * Anchors at noon before adding so a DST boundary can't shift the result by a
 * day — the same formalised workaround as the backend's parseCTDate.
 */
export function addDaysCT(n: number, from: string = todayCT()): string {
  const d = new Date(`${from}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  // tz-neutral: anchored at NOON UTC and stepped with setUTCDate, so this slice
  // reads the intended calendar day, not a timezone-shifted one. This is the
  // one place `toISOString().slice(0,10)` is correct — because `from` is already
  // a Central calendar date and we never leave UTC.
  return d.toISOString().slice(0, 10);
}

/**
 * Weekday of a 'YYYY-MM-DD' in Central. 0 = Sunday … 6 = Saturday.
 * Noon-anchored, so no TZ boundary can move it.
 */
export function weekdayCT(ds: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return null;
  const d = new Date(`${ds}T12:00:00Z`);
  if (isNaN(d.getTime())) return null;
  return d.getUTCDay();
}
