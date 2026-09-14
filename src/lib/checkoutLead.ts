/**
 * When the checkout page should (re)send the abandoned-checkout lead.
 *
 * It used to send exactly ONCE, on leaving the email field — which on this form
 * comes BEFORE the phone field. So the lead went out with no phone, the one-shot
 * guard then blocked the Continue-time send that had one, and 25 of 36 checkout
 * leads carried no phone number. Kyle Knudson (2026-09-14) reached the card
 * step; his order had his phone, his lead did not.
 *
 * Now the page sends whenever there is something NEW to say: the first valid
 * email, a phone the last send did not carry, or a corrected email. The server
 * upserts on email, so a second send updates the same lead rather than adding
 * one. Clearing the phone is not news and does not resend.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What a send would carry, or null when there is nothing contactable yet. */
export function leadSignature(email: string, phone: string): string | null {
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e)) return null;
  const digits = phone.replace(/\D/g, '');
  return `${e}|${digits.length >= 10 ? digits : ''}`;
}

/** Send only when the signature adds something the last send lacked. */
export function shouldSendLead(lastSent: string | null, next: string | null): boolean {
  if (!next || next === lastSent) return false;
  if (!lastSent) return true;
  const [lastEmail] = lastSent.split('|');
  const [nextEmail, nextPhone] = next.split('|');
  if (nextEmail !== lastEmail) return true;   // corrected email
  return Boolean(nextPhone);                  // a new or changed phone, never a cleared one
}
