'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type HuntState } from '@/lib/api';

// The player's game on /hunt. Sign-up texts a code; typing it in returns a token that is the
// player's only credential, kept in this browser's localStorage. Losing it costs nothing:
// signing up again with the same phone number texts a new code for the same entry. Answers
// are checked by the backend, never here.

const TOKEN_KEY = 'flipsies_hunt_token';

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });

function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function writeToken(t: string | null) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode: the game still works this visit */ }
}
const errMsg = (e: unknown, fallback: string) =>
  (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string')
    ? (e as { message: string }).message : fallback;

export default function HuntGame() {
  const [state, setState] = useState<HuntState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = readToken();
    (async () => {
      try {
        if (t) {
          try { setState(await api.huntStatus(t)); setToken(t); return; }
          catch { writeToken(null); }
        }
        setState(await api.huntInfo());
      } catch {
        setLoadErr('The hunt page could not load. Check your connection and refresh.');
      }
    })();
  }, []);

  // Steps open as their clues air; tick so a box appears without a refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (loadErr) return <p className="text-red-700">{loadErr}</p>;
  if (!state) return <p className="text-brand-charcoal-light">Loading…</p>;

  if (!token || !state.player) {
    return <SignUp closed={state.hunt.phase === 'closed' || state.hunt.phase === 'not_open'}
      onDone={(t, s) => { writeToken(t); setToken(t); setState(s); }} />;
  }
  return <Game state={state} token={token} now={now} onState={setState}
    onSwitch={() => { writeToken(null); setToken(null); api.huntInfo().then(setState).catch(() => {}); }} />;
}

function SignUp({ closed, onDone }: { closed: boolean; onDone: (token: string, s: HuntState) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Set once a code is on its way: the form swaps to the code box.
  const [sent, setSent] = useState<{ last4: string; returning: boolean; devCode?: string } | null>(null);

  if (closed) return <p className="text-brand-charcoal">Sign-up for this hunt is closed. Thanks for your interest!</p>;

  // Also the "text me a new code" button: the backend treats a repeat sign-up as a code request.
  const requestCode = async () => {
    const q = new URLSearchParams(window.location.search);
    const r = await api.huntSignup({
      name, phone, email: email || undefined,
      age_confirmed: true, rules_accepted: true, marketing_opt_in: marketing,
      utm_source: q.get('utm_source') || undefined,
      utm_medium: q.get('utm_medium') || undefined,
      utm_campaign: q.get('utm_campaign') || undefined,
    });
    setSent({ last4: r.phone_last4, returning: r.returning, devCode: r.dev_code });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!age) { setErr('Please confirm you are 18 or older and agree to the official rules.'); return; }
    setBusy(true);
    try {
      await requestCode();
    } catch (e2) {
      setErr(errMsg(e2, 'Sign-up did not go through. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <CodeStep phone={phone} sent={sent} onResend={requestCode} onBack={() => setSent(null)} onDone={onDone} />;
  }

  const field = 'w-full border border-brand-border rounded-lg px-3 py-2.5 text-brand-charcoal bg-white';
  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <h2 className="text-xl font-bold text-brand-charcoal">Sign up to play</h2>
      <p className="text-sm text-brand-charcoal-light">
        Free, and required to win. Already signed up on another phone? Enter the same mobile number to pick up where you left off.
      </p>
      <label className="block text-sm font-semibold text-brand-charcoal">
        Full name (as on your photo ID)
        <input className={`${field} mt-1`} value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
      </label>
      <label className="block text-sm font-semibold text-brand-charcoal">
        Mobile number
        <input className={`${field} mt-1`} value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" required />
        <span className="block font-normal text-xs text-brand-charcoal-light mt-1">
          We&apos;ll text this number a one-time code to confirm it&apos;s yours. Msg &amp; data rates may apply.
        </span>
      </label>
      <label className="block text-sm font-semibold text-brand-charcoal">
        Email <span className="font-normal text-brand-charcoal-light">(optional)</span>
        <input className={`${field} mt-1`} value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" />
      </label>
      <label className="flex gap-2 items-start text-sm text-brand-charcoal">
        <input type="checkbox" className="mt-1" checked={age} onChange={e => setAge(e.target.checked)} />
        <span>I am 18 or older and agree to the <Link href="/hunt/rules" className="underline" target="_blank">official rules</Link>.</span>
      </label>
      <label className="flex gap-2 items-start text-sm text-brand-charcoal-light">
        <input type="checkbox" className="mt-1" checked={marketing} onChange={e => setMarketing(e.target.checked)} />
        <span>Also send me Flipsies deals by text and email. Optional, and it has nothing to do with winning.</span>
      </label>
      {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
      <button type="submit" disabled={busy} className="btn-brand w-full !py-3">{busy ? 'Sending your code…' : 'Sign me up'}</button>
    </form>
  );
}

function CodeStep({ phone, sent, onResend, onBack, onDone }: {
  phone: string;
  sent: { last4: string; returning: boolean; devCode?: string };
  onResend: () => Promise<void>;
  onBack: () => void;
  onDone: (token: string, s: HuntState) => void;
}) {
  const [code, setCode] = useState(sent.devCode || '');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setNote('');
    setBusy(true);
    try {
      const r = await api.huntVerify(phone, code);
      onDone(r.token, r);
    } catch (e2) {
      setErr(errMsg(e2, 'That code did not go through. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setErr(''); setNote('');
    setResending(true);
    try { await onResend(); setCode(''); setNote('New code sent. Use the newest text.'); }
    catch (e2) { setErr(errMsg(e2, 'We could not send a new code. Please try again.')); }
    finally { setResending(false); }
  };

  return (
    <form onSubmit={verify} className="space-y-4 max-w-md">
      <h2 className="text-xl font-bold text-brand-charcoal">
        {sent.returning ? 'Welcome back. Check your texts' : 'Check your texts'}
      </h2>
      <p className="text-sm text-brand-charcoal-light">
        We texted a 6-digit code to the number ending in {sent.last4}. It works for 10 minutes.
      </p>
      <label className="block text-sm font-semibold text-brand-charcoal">
        Code
        <input
          className="w-full border border-brand-border rounded-lg px-3 py-2.5 text-brand-charcoal bg-white mt-1 tracking-widest text-lg"
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
        />
      </label>
      {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
      {note && <p className="text-sm text-brand-charcoal" role="status">{note}</p>}
      <button type="submit" disabled={busy || resending || code.length !== 6} className="btn-brand w-full !py-3">{busy ? 'Checking…' : 'Confirm and play'}</button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={resend} disabled={busy || resending} className="underline text-brand-charcoal-light">{resending ? 'Sending…' : 'Text me a new code'}</button>
        <button type="button" onClick={onBack} disabled={busy || resending} className="underline text-brand-charcoal-light">Change number</button>
      </div>
      <p className="text-xs text-brand-charcoal-light">
        No text? In the store, a Vault Keeper can give you a code.
      </p>
    </form>
  );
}

function Game({ state, token, now, onState, onSwitch }: {
  state: HuntState; token: string; now: number;
  onState: (s: HuntState) => void; onSwitch: () => void;
}) {
  const steps = state.steps;
  const solved = steps.filter(s => s.solved_at).length;
  const closed = now >= new Date(state.hunt.closes_at).getTime();
  const next = steps.find(s => !s.solved_at);
  const nextOpen = !!next && !closed && now >= new Date(next.opens_at).getTime();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-brand-charcoal">
          {state.player?.first_name ? `You're in, ${state.player.first_name}!` : "You're in!"}
        </h2>
        <button type="button" onClick={onSwitch} className="text-xs underline text-brand-charcoal-light">Not you?</button>
      </div>

      {state.player?.status === 'disqualified' && (
        <p className="text-sm text-red-700">This entry is no longer eligible. Please see a Vault Keeper.</p>
      )}

      {solved === steps.length ? (
        <div className="rounded-xl bg-brand-yellow-light border border-brand-yellow p-5">
          <p className="text-lg font-bold text-brand-charcoal">
            You solved the final riddle{state.finish_place ? `, finisher #${state.finish_place}` : ''}!
          </p>
          <p className="text-sm text-brand-charcoal mt-1">
            Show this screen to the Vault Master at the final station in our Irondale store, with your Cards A, B and C,
            stamped passport and photo ID. The first correct answer to the final riddle wins the $2,000.
          </p>
        </div>
      ) : state.hunt.phase === 'signup' && !nextOpen ? (
        <p className="text-sm text-brand-charcoal">
          Keep this page handy on Saturday. Each answer box opens when its clue airs. Bookmark it, or come back to
          flipsiesfurniture.com/hunt on the same phone.
        </p>
      ) : closed ? (
        <p className="text-sm text-brand-charcoal">The hunt has closed. Thanks for playing!</p>
      ) : null}

      <ol className="space-y-3">
        {steps.map(s => {
          const isNext = next?.step === s.step;
          const open = !closed && now >= new Date(s.opens_at).getTime();
          return (
            <li key={s.step} className={`rounded-xl border p-4 ${s.solved_at ? 'border-brand-green/40 bg-brand-green/5' : 'border-brand-border bg-white'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-brand-charcoal">{s.step}. {s.label}</p>
                <p className="text-xs text-brand-charcoal-light whitespace-nowrap">
                  {s.solved_at ? `✓ ${clock(s.solved_at)}` : open ? 'Open now' : `Opens ${clock(s.opens_at)}`}
                </p>
              </div>
              {!s.solved_at && s.prompt && (
                <p className="mt-2 text-sm text-brand-charcoal whitespace-pre-line">{s.prompt}</p>
              )}
              {isNext && open && (
                <AnswerBox key={s.step} token={token} step={s.step} hint={s.hint} lockedUntil={s.locked_until || null} onState={onState} />
              )}
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border border-brand-border bg-white p-4 text-sm text-brand-charcoal-light space-y-2">
        <h3 className="font-semibold text-brand-charcoal">The rules you agreed to</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Answers go in order. Radio clues open their boxes when they air; between them, the site shows the next clue to track down. Nothing is accepted after 4:00 pm.</li>
          <li>The Vault Master in Irondale gives the vault code&apos;s last digit after checking your original Cards A, B and C, your passport stamped in both stores, and a photo ID matching your registered name.</li>
          <li>A wrong vault code or final-riddle answer locks that box for one minute.</li>
          <li>The first correct answer to the final riddle, by the site&apos;s timestamp, wins.</li>
          <li>Nothing is hidden in or under furniture. Never move or climb on merchandise, and obey traffic laws.</li>
          <li>One entry per person. Extra entries, borrowed cards or tampering mean disqualification.</li>
        </ul>
        <p>
          <Link href="/hunt/rules" className="underline" target="_blank">Read the full official rules</Link>
        </p>
      </section>
    </div>
  );
}

function AnswerBox({ token, step, hint, lockedUntil, onState }: {
  token: string; step: number; hint: string; lockedUntil: string | null; onState: (s: HuntState) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(() => Date.now());
  const lockMs = lockedUntil ? new Date(lockedUntil).getTime() - tick : 0;
  const locked = lockMs > 0;
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setBusy(true); setMsg('');
    try {
      const r = await api.huntAnswer(token, step, answer);
      if (!r.correct) setMsg(r.message || 'Not quite. Try again.');
      else setAnswer('');
      onState(r);
    } catch (e2) {
      setMsg(errMsg(e2, 'That did not go through. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
      <input
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder={hint}
        aria-label={hint}
        autoCapitalize="characters"
        autoComplete="off"
        className="flex-1 min-w-0 border border-brand-border rounded-lg px-3 py-2.5 text-brand-charcoal bg-white"
      />
      <button type="submit" disabled={busy || locked} className="btn-brand !py-2.5 !px-5">{busy ? '…' : locked ? `${Math.ceil(lockMs / 1000)}s` : 'Check'}</button>
      {locked && <p className="basis-full text-sm text-red-700" role="status">Locked for {Math.ceil(lockMs / 1000)} more seconds after a wrong answer.</p>}
      {!locked && msg && <p className="basis-full text-sm text-red-700" role="alert">{msg}</p>}
    </form>
  );
}
