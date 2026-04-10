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
  /** YYYY-MM-DD in server-local timezone */
  date: string;
  /** Human label like "10:00 AM" or "10:00 AM - 12:00 PM" */
  time_label: string;
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

function isSlotFresh(slot: StoredSlot): boolean {
  const savedAtMs = new Date(slot.savedAt).getTime();
  if (isNaN(savedAtMs)) return false;
  if (Date.now() - savedAtMs > SLOT_TTL_MS) return false;

  // Slot date + start time (best-effort, falls back to midnight if parsing
  // the label fails — the backend does the authoritative check).
  const slotDate = new Date(`${slot.date}T00:00:00`);
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
    slotDate.setHours(hour, min, 0, 0);
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
