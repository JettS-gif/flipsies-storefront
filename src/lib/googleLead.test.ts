import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Checkout → Google lead conversion (Jett, 2026-10-08: "if they are Google
// sourced"). Locks the source rule, the once-per-session guard, the no-PII
// payload and the Meta opt-out.

const calls: Array<{ name: string; params: Record<string, unknown>; opts?: { meta?: boolean } }> = [];
vi.mock('./analytics', () => ({
  trackEvent: (name: string, params: Record<string, unknown>, opts?: { meta?: boolean }) => {
    calls.push({ name, params, opts });
  },
}));

const { isGoogleSourced, rememberLandingSource, checkoutLeadCaptured } = await import('./googleLead');

describe('isGoogleSourced', () => {
  it('gclid', () => expect(isGoogleSourced({ clickIds: ['gclid'] })).toBe(true));
  it('gbraid', () => expect(isGoogleSourced({ clickIds: ['gbraid'] })).toBe(true));
  it('wbraid', () => expect(isGoogleSourced({ clickIds: ['wbraid'] })).toBe(true));
  it('utm_source google, any case', () => {
    expect(isGoogleSourced({ utmSource: 'google' })).toBe(true);
    expect(isGoogleSourced({ utmSource: 'Google' })).toBe(true);
    expect(isGoogleSourced({ utmSource: 'GOOGLE' })).toBe(true);
  });
  it('referrer google.com / google.co.uk', () => {
    expect(isGoogleSourced({ referrer: 'https://www.google.com/' })).toBe(true);
    expect(isGoogleSourced({ referrer: 'https://google.com/search?q=sofa' })).toBe(true);
    expect(isGoogleSourced({ referrer: 'https://www.google.co.uk/' })).toBe(true);
  });
  it('bing / facebook / direct are not', () => {
    expect(isGoogleSourced({ referrer: 'https://www.bing.com/' })).toBe(false);
    expect(isGoogleSourced({ utmSource: 'bing' })).toBe(false);
    expect(isGoogleSourced({ referrer: 'https://l.facebook.com/' })).toBe(false);
    expect(isGoogleSourced({ utmSource: 'facebook', clickIds: [] })).toBe(false);
    expect(isGoogleSourced({})).toBe(false);
    expect(isGoogleSourced(null)).toBe(false);
  });
  it('look-alike hosts are not google', () => {
    expect(isGoogleSourced({ referrer: 'https://google.evil.com/' })).toBe(false);
    expect(isGoogleSourced({ referrer: 'https://notgoogle.com/' })).toBe(false);
    expect(isGoogleSourced({ referrer: 'not a url' })).toBe(false);
  });
});

// Minimal browser stubs — the suite runs in node (see vitest.config.mts).
function stubBrowser(search: string, referrer = '') {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    location: { search, host: 'flipsies.com' },
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
    },
  });
  vi.stubGlobal('document', { referrer });
  return {
    store,
    navigate(nextSearch: string) { (window as unknown as { location: { search: string } }).location.search = nextSearch; },
  };
}

describe('checkoutLeadCaptured', () => {
  beforeEach(() => { calls.length = 0; });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fires once per session for a gclid landing, even after in-app navigation', () => {
    const b = stubBrowser('?gclid=abc', 'https://www.googleadservices.com/');
    rememberLandingSource();
    b.navigate('');               // /shop → /checkout, referrer unchanged (SPA)
    rememberLandingSource();
    expect(checkoutLeadCaptured()).toBe(true);   // email blur
    expect(checkoutLeadCaptured()).toBe(false);  // phone blur
    expect(checkoutLeadCaptured()).toBe(false);  // Continue
    expect(calls).toHaveLength(1);
  });

  it('sends generate_lead with no PII and the Meta mirror suppressed', () => {
    stubBrowser('?utm_source=Google&utm_medium=cpc');
    rememberLandingSource();
    checkoutLeadCaptured();
    expect(calls[0].name).toBe('generate_lead');
    expect(calls[0].params).toEqual({ source: 'checkout', method: 'checkout' });
    expect(calls[0].opts).toEqual({ meta: false });
  });

  it('fires for an organic google.com referrer', () => {
    stubBrowser('', 'https://www.google.com/');
    rememberLandingSource();
    expect(checkoutLeadCaptured()).toBe(true);
  });

  it('falls back to siteEvents fs_utm utm_source', () => {
    const b = stubBrowser('');
    b.store.set('fs_utm', JSON.stringify({ utm_source: 'google', utm_medium: 'cpc' }));
    expect(checkoutLeadCaptured()).toBe(true);
  });

  it('does not fire for bing, facebook or direct', () => {
    stubBrowser('', 'https://www.bing.com/');
    rememberLandingSource();
    expect(checkoutLeadCaptured()).toBe(false);
    vi.unstubAllGlobals();

    stubBrowser('?fbclid=x&utm_source=facebook', 'https://l.facebook.com/');
    rememberLandingSource();
    expect(checkoutLeadCaptured()).toBe(false);
    vi.unstubAllGlobals();

    stubBrowser('');
    rememberLandingSource();
    expect(checkoutLeadCaptured()).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('a later Google ad click in the same session still counts', () => {
    const b = stubBrowser('', 'https://www.bing.com/');
    rememberLandingSource();
    expect(checkoutLeadCaptured()).toBe(false);
    b.navigate('?gbraid=xyz');
    rememberLandingSource();
    expect(checkoutLeadCaptured()).toBe(true);
  });

  it('never throws and never fires when storage is blocked', () => {
    vi.stubGlobal('window', {
      location: { search: '?gclid=abc', host: 'flipsies.com' },
      sessionStorage: {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
      },
    });
    vi.stubGlobal('document', { referrer: '' });
    expect(() => rememberLandingSource()).not.toThrow();
    expect(checkoutLeadCaptured()).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('is a no-op on the server', () => {
    expect(checkoutLeadCaptured()).toBe(false);
  });
});
