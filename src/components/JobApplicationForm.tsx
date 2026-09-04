'use client';

// The /careers application form.
//
// The careers page shipped without one deliberately — a form means personal
// data in a table, which needs somewhere to read it and somebody accountable
// for replying. Both of those now exist (job_applications + the Applications
// queue on the DeliverDesk Website panel), so the form follows.
//
// EMAIL AND PHONE STAY ON THE PAGE. This does not replace them. Plenty of the
// people we are hiring will not fill in a web form, and the crew roles in
// particular get filled by someone walking in. A form that hides the phone
// number narrows the funnel it was meant to widen.
//
// NO URL PRESELECT, and the reason is worth writing down because it looks like
// an omission. Every way to turn ?role=sales-associate into a selected dropdown
// costs something this page should not pay:
//   * reading window in an effect -> setState in an effect, which the React
//     Compiler lint rejects outright (cascading renders);
//   * reading window during render -> the server renders '' and the client
//     renders the role, which is a hydration mismatch;
//   * taking searchParams as a server prop -> opts the whole route into dynamic
//     rendering, and this is a static SEO page carrying JobPosting data.
// So the per-role links scroll to the form and the shopper picks from the
// dropdown. One extra click, no correctness cost, page stays static.

import { useState } from 'react';
import { api } from '@/lib/api';

export interface FormRole {
  slug: string;
  title: string;
}

type State = 'idle' | 'sending' | 'sent' | 'error';

export default function JobApplicationForm({ roles }: { roles: FormRole[] }) {
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setError('');

    // Checked here as well as on the server so the applicant gets an answer
    // without a round trip. The SERVER is still the authority — this is
    // courtesy, not validation.
    if (!role) return setError('Please choose which position you are applying for.');
    if (name.trim().length < 2) return setError('Please tell us your name.');
    if (!phone.trim() && !email.trim()) {
      return setError('Please leave a phone number or an email address so we can reach you.');
    }

    setState('sending');
    try {
      const res = await api.applyForJob({
        name: name.trim(),
        role_slug: role,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        company,
      });
      setNote(res?.message || '');
      setState('sent');
    } catch (err) {
      // The backend writes every refusal as a sentence a member of the public
      // can act on. Show that, never a code.
      const m = (err as { message?: string; error?: string })?.message;
      setError(m || 'Something went wrong sending that. Please call a showroom and ask for a manager.');
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <div className="bg-brand-warm-gray rounded-2xl p-8 sm:p-12 text-center">
        <div className="text-3xl mb-3" aria-hidden="true">✅</div>
        <h3 className="text-xl font-semibold text-brand-charcoal mb-2">Application received</h3>
        <p className="text-brand-charcoal-light leading-relaxed">
          {note || 'Thanks for applying — a manager will be in touch. If you don’t hear back within a week, please call the showroom; we would rather you chased us than assumed no.'}
        </p>
      </div>
    );
  }

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-brand-charcoal ' +
    'focus:border-brand-yellow-dark focus:outline-none focus:ring-1 focus:ring-brand-yellow-dark';
  const label = 'block text-sm font-medium text-brand-charcoal mb-1';

  return (
    <form onSubmit={submit} className="bg-brand-warm-gray rounded-2xl p-6 sm:p-10" noValidate>
      <h2 id="apply" className="text-2xl font-bold text-brand-charcoal mb-2">Apply Online</h2>
      <p className="text-sm text-brand-charcoal-light mb-6 leading-relaxed">
        Tell us who you are and how to reach you. No account, no resume upload — a name and a
        phone number is genuinely enough to start.
      </p>

      {/* Honeypot. Hidden from people and from screen readers; a bot fills it and
          the server drops the submission silently. Not display:none — some bots
          skip those; off-screen with aria-hidden and no tab stop is stronger. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="company">Company</label>
        <input
          id="company" name="company" type="text" tabIndex={-1} autoComplete="off"
          value={company} onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="role">Position <span className="text-red-600">*</span></label>
          <select id="role" className={field} value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Choose a position…</option>
            {roles.map((r) => (
              <option key={r.slug} value={r.slug}>{r.title}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="name">Your name <span className="text-red-600">*</span></label>
          <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)}
            autoComplete="name" required />
        </div>

        <div>
          <label className={label} htmlFor="phone">Phone</label>
          <input id="phone" className={field} type="tel" inputMode="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="(205) 555-0134" />
        </div>

        <div>
          <label className={label} htmlFor="email">Email</label>
          <input id="email" className={field} type="email" inputMode="email" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>

        <p className="sm:col-span-2 -mt-2 text-xs text-brand-charcoal-light">
          One of the two is enough — whichever you would rather we used.
        </p>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="message">Anything you&apos;d like us to know</label>
          <textarea id="message" className={field} rows={4} value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Previous work, availability, whether you have a license — whatever seems useful. Optional." />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>
      )}

      <button type="submit" disabled={state === 'sending'} className="btn-brand mt-6 disabled:opacity-60">
        {state === 'sending' ? 'Sending…' : 'Send Application'}
      </button>

      <p className="mt-4 text-xs text-brand-charcoal-light leading-relaxed">
        We use what you send here to consider you for the job and to get back to you — nothing else.
        We will not add you to any marketing list.
      </p>
    </form>
  );
}
