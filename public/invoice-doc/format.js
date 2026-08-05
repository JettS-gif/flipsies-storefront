// utils/format.js
// Pure formatting helpers — no DOM, no state, no side effects.
// All functions are named exports. Import what you need.

// ── Date helpers ───────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in America/Chicago (store operates in CT).
 *  Using toISOString() here produced UTC dates; after ~7pm CT the UTC day had already
 *  rolled to tomorrow, so quote-follow-ups, calendar reads, and cashflow pulls
 *  would drift forward one day. Anchor to Chicago explicitly. */
export function today() {
  // en-CA yields YYYY-MM-DD; timeZone pins it to CT regardless of server clock.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

/** CT calendar date (YYYY-MM-DD) for an ARBITRARY instant — Date, epoch ms, or
 *  a timestamptz ISO string. Twin of backend utils/time.js dateCT.
 *
 *  Use this instead of `row.some_timestamp.slice(0, 10)`. That slice takes the
 *  UTC day off a timestamptz, so anything recorded after ~7pm CT is filed under
 *  tomorrow — a 7pm clock-in lands on the next day's card, an evening payment
 *  books to the next date. It is the same bug as `toISOString().slice(0,10)`
 *  with fewer characters, which is exactly why it kept slipping past review. */
export function dateCT(ts) {
  if (!ts) return null;
  const d = (ts instanceof Date) ? ts : new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

/** Shift a YYYY-MM-DD date string by n days, staying on the CT calendar.
 *  Exists so "30 days ago" default ranges stop being written as
 *  `new Date(Date.now() - 30*86400000).toISOString().slice(0,10)`, which takes
 *  the UTC day and lands a day early from ~7pm CT onward. Noon-anchored, so a
 *  DST hop moves the clock to 11am/1pm and never crosses midnight.
 *  (reports.js has an identical local `shiftDays`; prefer this one in new code.) */
export function shiftDays(ds, n) {
  if (!ds || !/^\d{4}-\d{2}-\d{2}$/.test(ds)) return ds;
  const d = new Date(ds + 'T12:00:00');
  if (isNaN(d.getTime())) return ds;
  d.setDate(d.getDate() + Number(n || 0));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Pickups run only Tuesday / Thursday / Saturday (2026-07-04). Mirrors
 *  backend utils/time.js isAllowedPickupDay. Noon-anchor the date-only string
 *  so a TZ boundary can't shift the weekday. */
export const PICKUP_DAYS_LABEL = 'Tuesday, Thursday, and Saturday';
export function isAllowedPickupDay(ds) {
  if (!ds || !/^\d{4}-\d{2}-\d{2}$/.test(ds)) return false;
  const d = new Date(ds + 'T12:00:00');
  if (isNaN(d.getTime())) return false;
  return [2, 4, 6].includes(d.getDay()); // 0=Sun … 6=Sat
}

/**
 * "2025-04-05" → "Sat, Apr 5"
 * Forces noon local time so timezone shifts don't flip the day.
 */
export function formatDateLabel(ds) {
  return new Date(ds + 'T12:00:00')
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * "2025-04-05" → "Sat 4/5"  (used by schedule views)
 */
export function fmtSchedDate(dateStr) {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

/**
 * Pay period label: "Apr 1, 2025 – Apr 14, 2025"
 */
export function fmtPayPeriodLabel(start, end) {
  const fmt = d => new Date(d + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Timestamp → "3:45 PM"  (America/Chicago)
 */
export function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US',
    { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
}

/**
 * Timestamp → a CHAT timestamp that always says which day.
 *
 *   today      → "2:14 PM"
 *   yesterday  → "Yesterday 2:14 PM"
 *   last week  → "Mon 2:14 PM"
 *   older      → "Aug 1, 2:14 PM"
 *   other year → "Aug 1, 2025"
 *
 * WHY THIS EXISTS. Customer Texts rendered every message with fmtTs, which is
 * time-only, so a thread read "2:14 PM … 9:03 AM … 4:47 PM" with no way to tell
 * today's reply from last week's (Savannah, 2026-08-03). In a list of arrivals
 * the date is the whole point.
 *
 * A SEPARATE helper rather than widening fmtTs: its other five callers are
 * payroll punches and timecard rows that already sit under a date heading, and
 * repeating the date on every punch there is noise, not information.
 *
 * Relative rather than always-absolute because most messages in an open
 * conversation ARE from today, and stamping "Aug 3" on all of them buries the
 * few that aren't — the distinction Savannah needs is exactly the one a
 * relative format makes loudest.
 *
 * DAY COMPARISON GOES THROUGH dateCT, never through getDate(). The browser's
 * local day is not the store's day; a user in Denver (or any staff phone left
 * on a different zone) would otherwise see "Yesterday" on a message we consider
 * today's, and after ~7pm CT the UTC-vs-CT split does the same thing to everyone.
 */
export function fmtChatTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';

  const time = d.toLocaleTimeString('en-US',
    { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });

  const day = dateCT(d);
  if (day === today())                return time;
  if (day === shiftDays(today(), -1)) return `Yesterday ${time}`;

  // Inside the last week, the weekday is the most readable handle ("Mon"), but
  // only up to 6 days back — at 7 it would collide with the same weekday name
  // one week earlier, which is the ambiguity this function exists to remove.
  if (day > shiftDays(today(), -7)) {
    const wd = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' });
    return `${wd} ${time}`;
  }

  const sameYear = day.slice(0, 4) === today().slice(0, 4);
  const date = d.toLocaleDateString('en-US',
    { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  // Past new year, the year matters more than the minute.
  return sameYear ? `${date}, ${time}` : `${date}, ${day.slice(0, 4)}`;
}

/**
 * Timestamp → "Apr 27, 3:45 PM"  (America/Chicago)
 *
 * Drop-in replacement for `new Date(ts).toLocaleString()` on the
 * accountant views. The bare toLocaleString reads the *browser*
 * locale + zone, so an accountant logging in from outside Central
 * sees a different number than what's stored in the books, which
 * the agent's 2026-04-27 audit flagged as drift between
 * time-tracking (UTC bucket) and diet (CT bucket). This helper
 * pins both sides to America/Chicago.
 */
export function fmtDateTimeShort(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/**
 * Date → "YYYY-MM-DDTHH:mm"  in America/Chicago.
 *
 * Suitable for the default value of an `<input type="datetime-local">`.
 * Pre-fix the accountant views built this string with d.getHours()
 * etc., which reads the *browser* clock. An accountant in EST saw
 * their local hour pre-filled while the rest of the view ran in CT,
 * so default-now disagreed with displayed-now by an hour.
 *
 * Symmetric with parseCTInputValue() below — round-tripping through
 * both gives back the original UTC instant.
 */
export function toCTInputValue(d) {
  // sv-SE renders "YYYY-MM-DD HH:mm:ss" — slice and swap the space
  // for the `T` that <input type="datetime-local"> expects.
  const s = (d || new Date()).toLocaleString('sv-SE', { timeZone: 'America/Chicago' });
  return s.slice(0, 16).replace(' ', 'T');
}

/**
 * "YYYY-MM-DDTHH:mm" (CT wall-clock from a datetime-local input) → Date.
 *
 * The browser parses `new Date('2026-04-27T14:30')` as *browser-local*
 * time, not as CT. For non-CT users that drifts by their TZ offset.
 * This helper interprets the input as Central wall-clock and returns
 * the corresponding UTC instant — round-trip safe with toCTInputValue.
 */
export function parseCTInputValue(s) {
  if (!s) return null;
  // Tight shape match — the value is supposed to come from
  // `<input type="datetime-local">`, which always emits exactly
  // `YYYY-MM-DDTHH:mm`. Without this guard V8 parses lots of garbage
  // ("not-a-date:00Z") into surprise epochs.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  // Probe: parse the input as if it were UTC. The probe is wrong by
  // exactly the CT-vs-UTC offset for this calendar instant. Read that
  // offset by reformatting the probe in CT and subtracting.
  const probe = new Date(s + ':00Z');
  if (isNaN(probe.getTime())) return null;
  const ctWall = probe.toLocaleString('sv-SE', { timeZone: 'America/Chicago' });
  // ctWall is "YYYY-MM-DD HH:mm:ss" of the probe in CT — re-parse as UTC
  // to get a "what UTC time would I have read if I had read CT?" instant.
  const asIfUtc = new Date(ctWall.replace(' ', 'T') + 'Z').getTime();
  const ctOffsetMs = asIfUtc - probe.getTime();   // negative for CT (CT is UTC-5/-6)
  return new Date(probe.getTime() - ctOffsetMs);
}

/**
 * Returns YYYY-MM-DD of the most recent Sunday in America/Chicago.
 * Anchors "weekly" buckets to the store's local week so a Sunday
 * report stays Sunday after midnight UTC.
 */
export function sundayCT() {
  const todayStr = today();   // YYYY-MM-DD in CT
  const dows = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // Read CT day-of-week for "now" — bare getDay() would use the browser TZ.
  const wd = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short' });
  // Subtract that many days from today (anchored at noon for DST safety).
  const d = new Date(todayStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (dows[wd] ?? 0));
  return d.toISOString().slice(0, 10);
}

/**
 * Timestamp OR date-only string → "Apr 5"  (America/Chicago)
 *
 * Why the date-only branch exists:
 *   JavaScript parses `new Date("2026-04-22")` as UTC midnight per ISO 8601,
 *   NOT as local midnight. For a CT user, that renders as Apr 21 — one day
 *   earlier than what the string actually represents. The accountant
 *   calendar stores event_date as a `date` column which comes back as
 *   "YYYY-MM-DD" — exactly the input shape that trips this trap.
 *
 *   Fix: if the input matches yyyy-MM-dd exactly, parse at local noon
 *   (stable across DST) and format from that. Timestamps with a 'T' or
 *   'Z' marker still go through the original path so UTC timestamps
 *   continue to render in CT correctly.
 *
 *   Bug discovered 2026-04-19: "dates being randomly stored on the
 *   calendar visual on days next to them" — item modal header read one
 *   day earlier than the cell the item actually sat in.
 */
export function fmtDateShort(ts) {
  if (!ts) return '—';
  // Date-only string? Anchor to local noon to avoid UTC-midnight slip.
  if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
    return new Date(ts + 'T12:00:00').toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  }
  return new Date(ts).toLocaleDateString('en-US',
    { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
}

// ── Phone helpers ──────────────────────────────────────────────────────────────

/**
 * Phone string → "(205)-567-5725" for display.
 *
 * Storage stays in whatever raw form the backend hands us (E.164 like
 * `+12055675725` or 10-digit `2055675725`). This helper only changes
 * the visual rendering. Pass through anything that doesn't have the
 * expected number of digits — better to show a quirky raw value than
 * to silently truncate a real phone.
 */
export function fmtPhone(s) {
  if (s == null) return '';
  // Pull digits only. E.164 (`+12055675725`), 10-digit (`2055675725`),
  // and partial typing all collapse to the same digit string.
  const digits = String(s).replace(/\D/g, '');
  // 11-digit with leading "1" → strip country code.
  const local = digits.length === 11 && digits.startsWith('1')
    ? digits.slice(1)
    : digits;
  if (local.length !== 10) return String(s);   // unrecognized — display as-is
  return `(${local.slice(0, 3)})-${local.slice(3, 6)}-${local.slice(6)}`;
}

/**
 * Live-format a phone number for an `<input type="tel">` so the user
 * sees `(205)-567-5725` as they type instead of bare digits. Pairs
 * with `digitsOnly()` on the input handler — store digits, display
 * formatted.
 *
 * Unlike fmtPhone (which only formats once the number is complete),
 * this returns a partial mask so the field never visually flips
 * format mid-typing:
 *   ''           → ''
 *   '2'          → '2'
 *   '205'        → '(205)'
 *   '20556'      → '(205)-56'
 *   '2055675725' → '(205)-567-5725'
 *   '+12055675725' → '(205)-567-5725'  (strips +1)
 *
 * Anything beyond 10 digits gets truncated at 10 since the customer
 * model accepts a 10-digit US local number. Callers that need to
 * preserve the raw E.164 form (international or extension support)
 * should bypass this helper.
 */
export function formatPhoneInput(s) {
  if (s == null) return '';
  let digits = String(s).replace(/\D/g, '');
  // Strip leading "1" country code on 11-digit input.
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  // Cap at 10 digits — extra characters past a complete US number are
  // typos / paste-noise; ignore them rather than letting the mask
  // sprawl.
  digits = digits.slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ── Time helpers ───────────────────────────────────────────────────────────────

/**
 * Date object → "3:45 PM"
 */
export function fmt12Time(dateObj) {
  let h = dateObj.getHours(), m = dateObj.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * "HH:MM:SS" calendar item time (events/tasks) → "3:45 PM"
 */
export function fmtCalendarTime(t) {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr), m = parseInt(mStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * "HH:MM:SS" (server time string) → "3:45 PM"
 */
export function fmtShiftTime(t) {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr), m = parseInt(mStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Two shift time strings → "8:00 AM – 4:00 PM"
 */
export function fmtShiftDisplay(start, end) {
  if (!start || !end) return '';
  return `${fmtShiftTime(start)} – ${fmtShiftTime(end)}`;
}

/**
 * A time-off request → when it covers, in one line.
 *
 *   whole day    → "Aug 12, 2026"
 *   several days → "Aug 12, 2026 – Aug 14, 2026"
 *   part of a day→ "Aug 12, 2026 · 1:00 PM – 3:00 PM"
 *
 * Lives here rather than in the time-off view because four screens render the
 * same sentence (My Schedule, the Time Off board's pending cards + history
 * table, and the schedule grid) and a partial request that renders as a bare
 * date on any one of them is indistinguishable from a whole day off.
 */
export function fmtTimeOffWhen(r) {
  if (!r?.request_date) return '';
  const day = ds => new Date(ds + 'T12:00:00')
    .toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  const from = day(r.request_date);
  if (r.start_time && r.end_time) {
    return `${from} · ${fmtShiftDisplay(r.start_time, r.end_time)}`;
  }
  const to = r.end_date && r.end_date !== r.request_date ? day(r.end_date) : null;
  return to ? `${from} – ${to}` : from;
}

/**
 * "9:30 AM" or "09:30" → minutes since midnight (e.g. 570)
 * Returns null for unparseable input.
 */
export function minsFromMidnight(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2] || '0');
  const ampm = match[3];
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Minutes since midnight → "3:45 PM"
 */
export function formatMins(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Hours helpers ──────────────────────────────────────────────────────────────

/**
 * Two ISO timestamps → decimal hours (e.g. 7.5), or null if either is missing.
 */
export function hoursWorked(inTs, outTs) {
  if (!inTs || !outTs) return null;
  return (new Date(outTs) - new Date(inTs)) / 3600000;
}

/**
 * Decimal hours → "7h 30m"
 */
export function fmtHours(h) {
  if (h === null || h === undefined || isNaN(h)) return '—';
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

// ── Money helpers ──────────────────────────────────────────────────────────────

/**
 * Number → "$1,234.56" / "-$1,234.56" (en-US currency).
 *
 * THE canonical money formatter (2026-07-29 consolidation — ~30 local
 * copies across views disagreed on negative-sign placement, comma
 * grouping, and null handling). Uses Intl currency formatting, which is
 * what the GL / reconciliation / receipts screens already showed, so
 * accounting sees no change; the plain `$${n.toFixed(2)}` copies gain
 * comma grouping and a proper leading minus.
 *
 * null/undefined → "$0.00" (display-only; the arithmetic sources of
 * truth stay in utils/invoiceTotals.js — never fold math in here).
 */
export function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

// ── Order / status helpers ─────────────────────────────────────────────────────

/**
 * Status string → CSS class string  e.g. "pill pill-delivered"
 */
export function pillClass(s) {
  return `pill pill-${s}`;
}

/**
 * Internal status key → human label
 */
export function statusLabel(s) {
  return {
    scheduled:         'Scheduled',
    transit:           'En route',
    delivered:         'Delivered',
    issue:             'Issue',
    ready:             'Ready for Pickup',
    pickedup:          'Picked up',
    pending:           'Pending',
    awaiting_transfer: 'Awaiting transfer',
    ready_for_pickup:  'Ready for pickup',
    picked_up:         'Picked up',
  }[s] || s;
}

// ── Misc helpers ───────────────────────────────────────────────────────────────

/**
 * Address string → Google Maps directions URL
 */
export function mapsUrl(addr) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
}

// ── XSS protection ─────────────────────────────────────────────────────────────

/**
 * Escape a string for safe insertion into innerHTML / template literals.
 * Use anywhere user-controlled data (customer names, notes, addresses,
 * descriptions, message bodies) is being interpolated into HTML.
 *
 * Returns '' for null/undefined so callers can write `${escapeHtml(x.name)}`
 * without explicit null checks.
 */
const _ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, ch => _ESC_MAP[ch]);
}

/**
 * Shorthand alias. Same as escapeHtml — kept short for inline template use.
 */
export const esc = escapeHtml;

// Mirror on window so legacy inline-handler code paths (and the few files
// that still build templates without imports) can use it during the rollout.
if (typeof window !== 'undefined') {
  window.escapeHtml       = escapeHtml;
  window.esc              = escapeHtml;
  window.formatPhoneInput = formatPhoneInput;
  window.fmtPhone         = fmtPhone;
}
