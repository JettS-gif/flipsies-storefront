// ── Delivery slot persistence ───────────────────────────────────────────────
// Stores a customer's currently selected delivery slot in localStorage so it
// survives navigation between the product page, cart, and checkout.
//
// Two layers of freshness gating:
//   1. TTL: slots older than SLOT_TTL_MS are considered stale and ignored.
//      24 hours is long enough to survive a typical shopping session but
//      short enough that a customer who left a cart open for a day gets
//      re-prompted with current driver capacity.
//   2. 48h lead time: if the selected slot's date is within 48 hours of
//      "now", it's ignored regardless of TTL. Matches the backend
//      STOREFRONT_DELIVERY_LEAD_HOURS guard. Prevents "I picked a Wednesday
//      slot on Monday, got distracted until Tuesday night, now Wednesday
//      morning is too close to ship" scenarios.
//
// Callers should treat this as a hint, not a commitment — the backend
// re-checks the 48h rule on /store/order and will reject a tampered request
// anyway.

export interface StoredSlot {
  /** Normalized address string used to fetch the slot */
  address: string;
  /**
   * The same address as discrete parts (2026-08-12). Checkout captures street /
   * city / state / ZIP separately now, and `address` above is composed FROM
   * these — kept because the availability API and every existing reader take a
   * single string.
   *
   * All optional so a slot saved before this shipped still rehydrates; readers
   * fall back to splitting `address` on commas. Same forward-compat shape as
   * `hour_label` below.
   */
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  /** YYYY-MM-DD in server-local timezone */
  date: string;
  /**
   * The CONCRETE committed time, e.g. "12:15 PM". Sent back as the order's
   * time_window; the dispatch board places the stop here. Display hour_label.
   */
  time_label: string;
  /**
   * Customer-facing window, e.g. "12:00 PM – 1:00 PM" (2026-08-01). Optional
   * so a slot saved before this shipped still rehydrates — readers fall back
   * to time_label.
   */
  hour_label?: string;
  /** Minutes from midnight on the slot's date */
  time_mins: number;
  /** Delivery fee the scheduling engine quoted for this slot */
  price: number;
  /** "Within 15 min" / "Open day" / etc. — for display */
  proximity_label: string;
  /** Saturday convenience fee already baked into `price`. 0 on weekdays. */
  saturday_surcharge?: number;
  /** ISO timestamp when the slot was saved — used for TTL comparison */
  savedAt: string;
}

const STORAGE_KEY   = 'flipsies_delivery_slot';
const SLOT_TTL_MS   = 24 * 60 * 60 * 1000;       // 24h
const LEAD_HOURS_MS = 48 * 60 * 60 * 1000;       // 48h

/**
 * UTC offset for a Central calendar date: '-05:00' during CDT, '-06:00' during
 * CST. US DST runs from the second Sunday in March to the first Sunday in
 * November. Derived from the DATE rather than from "now", so a slot booked
 * either side of the changeover resolves with its own offset.
 */
function centralOffset(ds: string): string {
  const [y, m, d] = ds.split('-').map(Number);
  if (!y || !m || !d) return '-06:00';
  const nthSunday = (month: number, n: number) => {
    const first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + (n - 1) * 7;
  };
  const dstStart = { m: 3,  d: nthSunday(3, 2) };
  const dstEnd   = { m: 11, d: nthSunday(11, 1) };
  const after  = m > dstStart.m || (m === dstStart.m && d >= dstStart.d);
  const before = m < dstEnd.m   || (m === dstEnd.m   && d <  dstEnd.d);
  return after && before ? '-05:00' : '-06:00';
}

function isSlotFresh(slot: StoredSlot): boolean {
  const savedAtMs = new Date(slot.savedAt).getTime();
  if (isNaN(savedAtMs)) return false;
  if (Date.now() - savedAtMs > SLOT_TTL_MS) return false;

  // Slot date + start time, resolved in CENTRAL (best-effort — the backend does
  // the authoritative check).
  //
  // `new Date('2026-08-05T00:00:00')` has no zone, so it parses in the
  // CUSTOMER's timezone. The slot is a Central wall-clock time, so a shopper on
  // the west coast validated their 48-hour lead against a moment two hours off,
  // and one abroad far more — either dropping a slot that was still valid or
  // keeping one that wasn't. Anchor to Central explicitly.
  // CDT is UTC-5, CST UTC-6; the offset is picked from the slot's own date so a
  // slot booked across the DST boundary still resolves correctly.
  const slotDate = new Date(`${slot.date}T00:00:00${centralOffset(slot.date)}`);
  if (isNaN(slotDate.getTime())) return false;

  // Parse "10:00 AM" / "2 PM" style labels. If we can't parse, pessimistically
  // treat the slot as midnight on its date so the lead check uses the
  // earliest possible start.
  const firstHalf = slot.time_label.split(/\s*[-–]\s*/)[0].trim();
  const m = firstHalf.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/);
  if (m) {
    let hour = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const mer = m[3]?.toUpperCase();
    if (mer === 'PM' && hour < 12) hour += 12;
    if (mer === 'AM' && hour === 12) hour = 0;
    // setUTCHours, not setHours: slotDate is already the correct INSTANT for
    // Central midnight, so shifting it by the shopper's local hours would undo
    // the offset applied above. Add the wall-clock time in the same frame.
    slotDate.setUTCHours(slotDate.getUTCHours() + hour, min, 0, 0);
  }

  const slotStartMs = slotDate.getTime();
  if (slotStartMs - Date.now() < LEAD_HOURS_MS) return false;

  return true;
}

/**
 * Load the currently saved slot, or null if none/stale/expired.
 * Automatically clears stale entries so repeated reads don't keep
 * returning invalid data.
 */
export function loadStoredSlot(): StoredSlot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const slot = JSON.parse(raw) as StoredSlot;
    if (!slot.address || !slot.date || !slot.time_label) return null;
    if (!isSlotFresh(slot)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return slot;
  } catch {
    return null;
  }
}

/**
 * Persist a slot selection. Overwrites any existing entry.
 */
export function saveStoredSlot(slot: Omit<StoredSlot, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const full: StoredSlot = { ...slot, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // Quota exceeded or private browsing — ignore silently
  }
}

/**
 * Clear the stored slot. Call this after a successful checkout so the next
 * visitor doesn't see a stale selection.
 */
export function clearStoredSlot(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
