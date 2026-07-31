import { describe, it, expect } from 'vitest';
import { todayCT, monthCT, addDaysCT, weekdayCT } from './ct';

describe('todayCT / monthCT', () => {
  it('returns a YYYY-MM-DD shape', () => {
    expect(todayCT()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(monthCT()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('month is the first 7 chars of the date', () => {
    expect(monthCT()).toBe(todayCT().slice(0, 7));
  });

  // THE POINT OF THE FILE. `toISOString().slice(0,10)` reads the UTC date, which
  // is already tomorrow after 7pm CT — on Vercel (UTC) and in a Central
  // shopper's browser alike. These must not agree in that window.
  it('does not simply mirror the UTC date', () => {
    const utcDate = new Date().toISOString().slice(0, 10);
    const ct = todayCT();
    const utcHour = new Date().getUTCHours();
    // Between 00:00 and 05:00 UTC, Central is still the previous day.
    if (utcHour < 5) expect(ct < utcDate).toBe(true);
    else expect(ct).toBe(utcDate);
  });
});

describe('addDaysCT', () => {
  it('adds and subtracts', () => {
    expect(addDaysCT(1, '2026-07-31')).toBe('2026-08-01');
    expect(addDaysCT(-1, '2026-08-01')).toBe('2026-07-31');
    expect(addDaysCT(0, '2026-07-31')).toBe('2026-07-31');
  });

  it('crosses month and year boundaries', () => {
    expect(addDaysCT(1, '2026-12-31')).toBe('2027-01-01');
    expect(addDaysCT(2, '2026-02-27')).toBe('2026-03-01'); // 2026 is not a leap year
  });

  // The 48-hour pickup rule, which is what this was written for.
  it('the +2 pickup minimum lands on the right day', () => {
    expect(addDaysCT(2, '2026-07-31')).toBe('2026-08-02');
  });

  it('survives both DST boundaries', () => {
    expect(addDaysCT(1, '2026-03-07')).toBe('2026-03-08');  // spring forward
    expect(addDaysCT(1, '2026-11-01')).toBe('2026-11-02');  // fall back
  });
});

describe('weekdayCT', () => {
  it('reads the correct weekday', () => {
    expect(weekdayCT('2026-08-02')).toBe(0); // Sunday
    expect(weekdayCT('2026-08-04')).toBe(2); // Tuesday
    expect(weekdayCT('2026-08-06')).toBe(4); // Thursday
    expect(weekdayCT('2026-08-08')).toBe(6); // Saturday
  });

  it('is stable across DST', () => {
    expect(weekdayCT('2026-03-08')).toBe(0);
    expect(weekdayCT('2026-11-01')).toBe(0);
  });

  it('rejects garbage rather than guessing', () => {
    expect(weekdayCT('')).toBeNull();
    expect(weekdayCT('07/31/2026')).toBeNull();
    expect(weekdayCT('2026-13-40')).toBeNull();
  });
});
