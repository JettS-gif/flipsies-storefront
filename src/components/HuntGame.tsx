'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type HuntState } from '@/lib/api';

// The player's game on /hunt. Sign-up returns a token that is the player's only credential;
// it lives in this browser's localStorage. Losing it costs nothing: signing up again with the
// same phone number hands the same entry back. Answers are checked by the backend, never here.

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

  if (closed) return <p className="text-brand-charcoal">Sign-up for this hunt is closed. Thanks for your interest!</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!age) { setErr('Please confirm you are 18 or older and agree to the official rules.'); return; }
    setBusy(true);
    try {
      const q = new URLSearchParams(window.location.search);
      const r = await api.huntSignup({
        name, phone, email: email || undefined,
        age_confirmed: true, rules_accepted: true, marketing_opt_in: marketing,
        utm_source: q.get('utm_source') || undefined,
        utm_medium: q.get('utm_medium') || undefined,
        utm_campaign: q.get('utm_campaign') || undefined,
      });
      onDone(r.token, r);
    } catch (e2) {
      setErr(errMsg(e2, 'Sign-up did not go through. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

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
      <button type="submit" disabled={busy} className="btn-brand w-full !py-3">{busy ? 'Signing up…' : 'Sign me up'}</button>
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
            You cracked the vault{state.finish_place ? `, finisher #${state.finish_place}` : ''}!
          </p>
          <p className="text-sm text-brand-charcoal mt-1">
            Go to the Vault Keeper at the final station in our Irondale store with Cards A, B and C, your passport
            stamped in both stores, and your photo ID. The first finisher to be verified wins the $2,000.
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
              {isNext && open && <AnswerBox token={token} step={s.step} hint={s.hint} onState={onState} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AnswerBox({ token, step, hint, onState }: {
  token: string; step: number; hint: string; onState: (s: HuntState) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

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
      <button type="submit" disabled={busy} className="btn-brand !py-2.5 !px-5">{busy ? '…' : 'Check'}</button>
      {msg && <p className="basis-full text-sm text-red-700" role="alert">{msg}</p>}
    </form>
  );
}
