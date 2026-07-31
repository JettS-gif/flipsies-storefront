import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadStoredSlot, saveStoredSlot, clearStoredSlot, type StoredSlot } from './deliverySlot';

// The stored delivery slot is what a returning visitor sees pre-selected at
// checkout. Two failure directions, both customer-facing:
//   * too permissive — a stale slot survives and the customer checks out
//     against a date that has passed or is inside the 48h lead time, so the
//     order lands undeliverable and someone has to phone them.
//   * too aggressive — a valid selection is dropped and the customer silently
//     re-picks, which mostly reads as the site "forgetting" things.
//
// The module guards `typeof window === 'undefined'` for SSR, so the suite runs
// in node and installs a localStorage stub per test rather than paying for jsdom
// across the whole project.

const KEY = 'flipsies_delivery_slot';
const DAY = 24 * 60 * 60 * 1000;

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    get size() { return map.size; },
  };
}
let storage: ReturnType<typeof makeStorage>;

// A slot far enough out to clear the 48h lead guard.
const futureDate = (daysAhead: number) => {
  const d = new Date(Date.now() + daysAhead * DAY);
  return d.toISOString().slice(0, 10);
};

beforeEach(() => {
  storage = makeStorage();
  vi.stubGlobal('window', {} as unknown as Window);
  vi.stubGlobal('localStorage', storage);
});
afterEach(() => vi.unstubAllGlobals());

// Full StoredSlot minus savedAt (which saveStoredSlot stamps). Kept complete
// rather than cast: the fixture typechecks against the real interface, so if a
// field is added to StoredSlot this test fails to compile and gets updated,
// instead of silently exercising a shape the app no longer uses.
const validSlot = (): Omit<StoredSlot, 'savedAt'> => ({
  address: '123 Oak St, Birmingham, AL 35226',
  date: futureDate(7),
  time_label: '10:00 AM - 12:00 PM',
  time_mins: 600,          // 10:00 AM
  price: 99.97,
  proximity_label: 'Within 15 min',
});

describe('deliverySlot storage', () => {
  it('round-trips a valid slot', () => {
    saveStoredSlot(validSlot());
    const got = loadStoredSlot();
    expect(got?.address).toBe(validSlot().address);
    expect(got?.time_label).toBe('10:00 AM - 12:00 PM');
  });

  it('stamps savedAt on write', () => {
    saveStoredSlot(validSlot());
    const raw = JSON.parse(storage.getItem(KEY)!);
    expect(raw.savedAt).toBeTruthy();
    expect(Number.isNaN(new Date(raw.savedAt).getTime())).toBe(false);
  });

  it('returns null when nothing is stored', () => {
    expect(loadStoredSlot()).toBeNull();
  });

  it('clearStoredSlot removes it', () => {
    saveStoredSlot(validSlot());
    clearStoredSlot();
    expect(loadStoredSlot()).toBeNull();
    expect(storage.size).toBe(0);
  });

  // Corrupt storage must not throw into a React render.
  it('survives unparseable JSON', () => {
    storage.setItem(KEY, '{not json');
    expect(() => loadStoredSlot()).not.toThrow();
    expect(loadStoredSlot()).toBeNull();
  });

  it('rejects a slot missing any required field', () => {
    for (const partial of [
      { date: futureDate(7), time_label: '10:00 AM - 12:00 PM' },
      { address: 'x', time_label: '10:00 AM - 12:00 PM' },
      { address: 'x', date: futureDate(7) },
    ]) {
      storage.setItem(KEY, JSON.stringify({ ...partial, savedAt: new Date().toISOString() }));
      expect(loadStoredSlot()).toBeNull();
    }
  });

  // TTL: a selection older than 24h is stale regardless of the slot date.
  it('drops an entry saved more than 24h ago', () => {
    storage.setItem(KEY, JSON.stringify({
      ...validSlot(),
      savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    }));
    expect(loadStoredSlot()).toBeNull();
  });

  it('keeps an entry saved within 24h', () => {
    storage.setItem(KEY, JSON.stringify({
      ...validSlot(),
      savedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    }));
    expect(loadStoredSlot()).not.toBeNull();
  });

  // Lead time: the slot itself must still be far enough out. This is the guard
  // that stops "I picked Wednesday two days ago, and it's now Wednesday."
  it('drops a slot whose date has already passed', () => {
    storage.setItem(KEY, JSON.stringify({
      ...validSlot(),
      date: new Date(Date.now() - 2 * DAY).toISOString().slice(0, 10),
      savedAt: new Date().toISOString(),
    }));
    expect(loadStoredSlot()).toBeNull();
  });

  it('drops a slot inside the 48h lead window', () => {
    storage.setItem(KEY, JSON.stringify({
      ...validSlot(),
      date: futureDate(1), // tomorrow — inside 48h
      savedAt: new Date().toISOString(),
    }));
    expect(loadStoredSlot()).toBeNull();
  });

  // A stale read must also CLEAN UP, or every subsequent read re-parses and
  // re-rejects the same dead entry.
  it('purges a stale entry rather than just hiding it', () => {
    storage.setItem(KEY, JSON.stringify({
      ...validSlot(),
      savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    }));
    loadStoredSlot();
    expect(storage.getItem(KEY)).toBeNull();
  });

  // SSR: these run during Next's server render, where there is no window.
  it('is a no-op without a window (server render)', () => {
    vi.unstubAllGlobals();
    expect(loadStoredSlot()).toBeNull();
    expect(() => saveStoredSlot(validSlot())).not.toThrow();
    expect(() => clearStoredSlot()).not.toThrow();
  });
});
