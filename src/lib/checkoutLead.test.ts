import { describe, expect, test } from 'vitest';
import { leadSignature, shouldSendLead } from './checkoutLead';

describe('leadSignature', () => {
  test('nothing contactable until the email looks deliverable', () => {
    expect(leadSignature('kyle@', '')).toBeNull();
    expect(leadSignature('  Kyle@Example.com ', '')).toBe('kyle@example.com|');
  });
  test('a phone counts once it has ten digits', () => {
    expect(leadSignature('k@x.co', '(912) 610')).toBe('k@x.co|');
    expect(leadSignature('k@x.co', '(912) 610-1946')).toBe('k@x.co|9126101946');
  });
});

describe('shouldSendLead — the form goes name, email, phone', () => {
  test('email blur sends; the later phone is sent too (the Knudson gap)', () => {
    const afterEmail = leadSignature('k@x.co', '');
    expect(shouldSendLead(null, afterEmail)).toBe(true);
    const afterPhone = leadSignature('k@x.co', '9126101946');
    expect(shouldSendLead(afterEmail, afterPhone)).toBe(true);
  });
  test('nothing new, nothing sent — blur/Continue/tabbing back stay one send', () => {
    const sig = leadSignature('k@x.co', '9126101946');
    expect(shouldSendLead(sig, sig)).toBe(false);
  });
  test('clearing the phone is not news', () => {
    expect(shouldSendLead(leadSignature('k@x.co', '9126101946'), leadSignature('k@x.co', ''))).toBe(false);
  });
  test('a corrected email is sent', () => {
    expect(shouldSendLead(leadSignature('k@x.con', ''), leadSignature('k@x.com', ''))).toBe(true);
  });
  test('an invalid email never sends', () => {
    expect(shouldSendLead(null, leadSignature('nope', '9126101946'))).toBe(false);
  });
});
