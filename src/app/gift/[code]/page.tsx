'use client';

// ── Gift card balance (/gift/<code>) ───────────────────────────────────────────
//
// Every Flipsies gift card's QR opens this page (BE utils/giftCardCodes.js
// giftBalanceUrl). It shows the balance, then invites the holder to make an
// online account with the card saved to it (Jett 2026-11-19: "encourage them to
// set up an online customer account"). Gift recipients are mostly NEW people,
// which the normal sign-in can't take, so a sold card that no account has saved
// yet unlocks signing up (Jett 2026-11-20). Backend: routes/store.js
// /storefront/gift-cards/:code and /portal/*; utils/giftCardPortal.js.

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import PortalSmsConsent from '@/components/PortalSmsConsent';
import { SHOWROOMS, HOURS_DISPLAY } from '@/lib/site';
import {
  getGiftCardBalance,
  portalRequestOtp,
  portalVerifyOtp,
  portalSaveGiftCard,
  saveCustomerSession,
  clearCustomerSession,
  isSignedIn,
  getCustomer,
  type PublicGiftCard,
} from '@/lib/customerSession';

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const field = 'w-full border border-brand-border rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-yellow';

type Load = { state: 'loading' } | { state: 'notfound' } | { state: 'error' } | { state: 'ok'; card: PublicGiftCard };

export default function GiftCardPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code || '');
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getGiftCardBalance(code);
        if (cancelled) return;
        if (r.notFound) setLoad({ state: 'notfound' });
        else if (!r.ok || !r.card) setLoad({ state: 'error' });
        else setLoad({ state: 'ok', card: r.card });
      } catch {
        if (!cancelled) setLoad({ state: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="bg-brand-warm-gray min-h-[calc(100vh-4rem)]">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 space-y-6">
        <BalanceCard load={load} />
        {load.state === 'ok' && load.card.status === 'active' && (
          <AccountPrompt code={code} card={load.card} />
        )}
        <WhereToSpend />
      </div>
    </div>
  );
}

function BalanceCard({ load }: { load: Load }) {
  const shell = 'bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm text-center';
  if (load.state === 'loading') {
    return <div className={shell}><p className="text-sm text-brand-charcoal-light">Checking your card…</p></div>;
  }
  if (load.state === 'notfound') {
    return (
      <div className={shell}>
        <h1 className="text-xl font-bold text-brand-charcoal">We couldn&apos;t find that card</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">
          Try scanning the QR code on the back of the card again. If it still doesn&apos;t work, call us and we&apos;ll look it up.
        </p>
      </div>
    );
  }
  if (load.state === 'error') {
    return (
      <div className={shell}>
        <h1 className="text-xl font-bold text-brand-charcoal">We couldn&apos;t check the card right now</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">Please refresh the page in a minute, or call us.</p>
      </div>
    );
  }
  const { card } = load;
  if (card.status === 'unissued') {
    return (
      <div className={shell}>
        <p className="text-xs uppercase tracking-wide text-brand-charcoal-light">Flipsies gift card ending {card.last4}</p>
        <h1 className="text-xl font-bold text-brand-charcoal mt-2">This card hasn&apos;t been activated yet</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">
          A card is activated at our register when it&apos;s bought. If someone gave you this card, give us a call and we&apos;ll sort it out.
        </p>
      </div>
    );
  }
  if (card.status === 'void') {
    return (
      <div className={shell}>
        <p className="text-xs uppercase tracking-wide text-brand-charcoal-light">Flipsies gift card ending {card.last4}</p>
        <h1 className="text-xl font-bold text-brand-charcoal mt-2">This card is no longer active</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">Questions? Call us and we&apos;ll help.</p>
      </div>
    );
  }
  return (
    <div className={shell}>
      <p className="text-xs uppercase tracking-wide text-brand-charcoal-light">Flipsies gift card ending {card.last4}</p>
      <p className="text-5xl font-bold text-brand-charcoal mt-3">{money(card.balance)}</p>
      <p className="text-sm text-brand-charcoal-light mt-2">
        {card.balance > 0 ? 'available to spend' : 'This card has been fully used.'}
      </p>
      <Link href="/shop" className="btn-brand inline-block mt-5 px-6 py-3 text-base">Browse furniture</Link>
    </div>
  );
}

function WhereToSpend() {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm">
      <h2 className="text-base font-bold text-brand-charcoal">Use it at either showroom</h2>
      <p className="text-sm text-brand-charcoal-light mt-1">Bring the card to the register, or call and we&apos;ll take it over the phone.</p>
      <ul className="mt-3 space-y-3 text-sm">
        {SHOWROOMS.map(s => (
          <li key={s.slug}>
            <span className="font-semibold text-brand-charcoal">{s.city}</span>
            <span className="text-brand-charcoal-light"> · {s.street} · </span>
            <a href={`tel:${s.phone.replace(/\D/g, '')}`} className="underline text-brand-charcoal">{s.phone}</a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-brand-charcoal-light mt-3">
        {HOURS_DISPLAY.map(h => `${h.days}: ${h.time}`).join(' · ')}
      </p>
    </div>
  );
}

type Step = 'form' | 'code' | 'done';

function AccountPrompt({ code, card }: { code: string; card: PublicGiftCard }) {
  const { syncCartFromAccount } = useCart();
  const [signedIn, setSignedIn] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [doneText, setDoneText] = useState('');

  // localStorage is only readable after mount.
  useEffect(() => { setSignedIn(isSignedIn()); }, []);

  const shell = 'bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm';
  const gift = { gift_card_code: code, first_name: firstName.trim(), last_name: lastName.trim() };

  async function saveToAccount() {
    setBusy(true); setError(null);
    try {
      const r = await portalSaveGiftCard(code);
      if (r.unauthorized) { clearCustomerSession(); setSignedIn(false); return; }
      if (!r.ok || !r.save) { setError(r.message || 'Could not save the card. Please try again.'); return; }
      setDoneText(r.save.result === 'already_yours' ? 'This card is already saved to your account.' : 'Saved! You can check this card any time from your account.');
      setStep('done');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null); setDevHint(null);
    if (!firstName.trim()) return setError('Please enter your first name.');
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a 10-digit phone number.');
    if (!consent) return setError('Please agree to receive text messages to continue.');
    setBusy(true);
    try {
      const r = await portalRequestOtp(phone, gift);
      if (!r.ok) {
        setError(r.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : 'Could not send the code. Please try again.');
        return;
      }
      if (r.devCode) { setOtp(r.devCode); setDevHint(`Dev mode: code ${r.devCode} prefilled.`); }
      setStep('code');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = otp.replace(/\D/g, '');
    if (clean.length !== 6) return setError('Enter the 6-digit code from your text message.');
    setBusy(true);
    try {
      const r = await portalVerifyOtp(phone, clean, gift);
      if (!r.ok || !r.token || !r.customer) {
        setError(r.status === 429 ? 'Too many tries. Please wait and try again.'
          : r.message || 'That code is incorrect or expired. Request a new one.');
        return;
      }
      saveCustomerSession(r.token, r.customer);
      await syncCartFromAccount();
      setSignedIn(true);
      const saved = r.gift_card?.result === 'linked' || r.gift_card?.result === 'already_yours';
      setDoneText(
        (r.created ? `Welcome, ${r.customer.first_name || 'friend'}! Your account is ready.` : `Welcome back, ${r.customer.first_name || 'friend'}!`)
        + (saved ? ' This card is saved to it.' : r.gift_card?.message ? ` ${r.gift_card.message}` : ''),
      );
      setStep('done');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const errorBox = error && (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  );

  if (step === 'done') {
    return (
      <div className={shell}>
        <h2 className="text-lg font-bold text-brand-charcoal">You&apos;re all set</h2>
        <p className="text-sm text-brand-charcoal-light mt-2">{doneText}</p>
        <Link href="/account" className="btn-brand inline-block mt-4 px-5 py-2.5 text-sm">Go to my account</Link>
      </div>
    );
  }

  if (signedIn) {
    const name = getCustomer()?.first_name;
    return (
      <div className={shell}>
        <h2 className="text-lg font-bold text-brand-charcoal">Save this card to your account{name ? `, ${name}` : ''}</h2>
        <p className="text-sm text-brand-charcoal-light mt-2">Check the balance any time without the card in hand.</p>
        {errorBox && <div className="mt-3">{errorBox}</div>}
        <button type="button" disabled={busy} onClick={saveToAccount} className="btn-brand w-full py-3 text-base mt-4 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save to my account'}
        </button>
      </div>
    );
  }

  // Already saved by someone: only that account's owner can sign in from here,
  // and a new phone can't sign up with it — send them to the normal sign-in.
  if (card.saved_to_account) {
    return (
      <div className={shell}>
        <h2 className="text-lg font-bold text-brand-charcoal">Is this your card?</h2>
        <p className="text-sm text-brand-charcoal-light mt-2">It&apos;s saved to an online account. Sign in to see it with your orders.</p>
        <Link href="/account/login" className="btn-brand inline-block mt-4 px-5 py-2.5 text-sm">Sign in</Link>
      </div>
    );
  }

  return (
    <div className={shell}>
      <h2 className="text-lg font-bold text-brand-charcoal">Create your free Flipsies account</h2>
      <ul className="text-sm text-brand-charcoal-light mt-2 space-y-1 list-disc pl-5">
        <li>Check this card&apos;s balance any time, no card needed</li>
        <li>Track your orders and delivery</li>
        <li>Save furniture you love for later</li>
      </ul>
      <p className="text-xs text-brand-charcoal-light mt-2">Already shop with us? Use the phone number on your account and we&apos;ll sign you in.</p>

      {step === 'form' && (
        <form onSubmit={sendCode} className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" className={field} />
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" autoComplete="family-name" className={field} />
          </div>
          <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile phone" className={field} />
          <PortalSmsConsent checked={consent} onChange={setConsent} />
          {errorBox}
          <button type="submit" disabled={busy || !consent} className="btn-brand w-full py-3 text-base disabled:opacity-50">
            {busy ? 'Sending code…' : 'Text me a code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verify} className="space-y-3 mt-4">
          <div className="bg-brand-warm-gray rounded-lg px-4 py-3 text-sm text-brand-charcoal-light">We texted a code to {phone}.</div>
          {devHint && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{devHint}</div>}
          <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)}
            placeholder="123456" className={`${field} text-xl tracking-[0.3em] text-center font-mono`} />
          {errorBox}
          <button type="submit" disabled={busy} className="btn-brand w-full py-3 text-base disabled:opacity-50">
            {busy ? 'Checking…' : 'Continue'}
          </button>
          <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(null); setDevHint(null); }}
            className="w-full text-xs text-brand-charcoal-light hover:text-brand-charcoal underline">
            ← Use a different phone number
          </button>
        </form>
      )}
    </div>
  );
}
