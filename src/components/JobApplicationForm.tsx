'use client';

// The /careers application form.
//
// The careers page shipped without one deliberately — a form means personal
// data in a table, which needs somewhere to read it and somebody accountable
// for replying. Both of those now exist (job_applications + the Applications
// tab in DeliverDesk), so the form follows.
//
// THE FULL APPLICATION (2026-09-13). The first version asked for contact
// details and one optional box, and the first real applicant arrived as a name
// and a phone number — nothing to read before calling her. Jett chose
// availability, work history, per-role screening and an optional resume, with
// everything but the resume REQUIRED.
//
// THE QUESTIONS HAVE TWO COPIES. This file renders them; the backend's
// utils/jobApplications.js validates them and freezes its own wording onto the
// row. The KEYS must match — a key renamed here alone is an answer the server
// ignores, followed by a refusal for not answering. The backend suite reads this
// file and fails on a missing key, so change both in the same sitting.
//
// EMAIL AND PHONE STAY ON THE PAGE. This does not replace them. Plenty of the
// people we are hiring will not fill in a web form, and the crew roles in
// particular get filled by someone walking in. A longer form makes that route
// more important, not less.
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

// Must equal FORM_VERSION in the backend's utils/jobApplications.js.
const FORM_VERSION = 2;

const DAYS: [string, string][] = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
  ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];
const HOURS: [string, string][] = [['full_time', 'Full-time'], ['part_time', 'Part-time'], ['either', 'Either']];
const SHOWROOMS: [string, string][] = [['hoover', 'Hoover'], ['irondale', 'Irondale'], ['either', 'Either']];

// Crew roles are Irondale-based; only these two genuinely offer a choice.
const ROLES_WITH_SHOWROOM_CHOICE = ['sales-associate', 'office-administrator'];

const CREW = ['delivery-driver', 'delivery-helper', 'warehouse-associate'];
const SCREENING: { key: string; roles: string[] | null; question: string }[] = [
  { key: 'age_18',          roles: null,               question: 'Are you at least 18 years old?' },
  { key: 'work_authorized', roles: null,               question: 'Are you legally authorized to work in the United States?' },
  { key: 'drivers_license', roles: ['delivery-driver'], question: 'Do you have a valid driver’s license?' },
  { key: 'clean_record',    roles: ['delivery-driver'], question: 'Is your driving record clean?' },
  { key: 'box_truck',       roles: ['delivery-driver'], question: 'Have you driven a box truck before?' },
  { key: 'heavy_lifting',   roles: CREW,               question: 'Can you lift and carry heavy furniture with a partner through a full shift?' },
];

const RESUME_MAX_BYTES = 5 * 1024 * 1024;
const RESUME_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,'
  + 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';

interface Job { employer: string; title: string; dates: string; reason_left: string }
const EMPTY_JOB: Job = { employer: '', title: '', dates: '', reason_left: '' };
const jobStarted = (j: Job) => !!(j.employer.trim() || j.title.trim() || j.dates.trim() || j.reason_left.trim());
const jobComplete = (j: Job) => !!(j.employer.trim() && j.title.trim() && j.dates.trim());

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function JobApplicationForm({ roles }: { roles: FormRole[] }) {
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [hours, setHours] = useState('');
  const [showroom, setShowroom] = useState('');
  const [screening, setScreening] = useState<Record<string, boolean>>({});
  const [firstJob, setFirstJob] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([{ ...EMPTY_JOB }]);
  const [resume, setResume] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const questions = SCREENING.filter((q) => !q.roles || q.roles.includes(role));
  const asksShowroom = ROLES_WITH_SHOWROOM_CHOICE.includes(role);

  const toggleDay = (d: string) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const setJob = (i: number, patch: Partial<Job>) =>
    setJobs((cur) => cur.map((j, k) => (k === i ? { ...j, ...patch } : j)));

  const pickResume = (file: File | null) => {
    setError('');
    if (file && file.size > RESUME_MAX_BYTES) {
      setResume(null);
      setError('Your resume is larger than 5 MB. Please attach a smaller file.');
      return;
    }
    setResume(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setError('');

    // Checked here as well as on the server so the applicant gets an answer
    // without a round trip. The SERVER is still the authority — this is
    // courtesy, not validation — and the wording matches its refusals.
    if (!role) return setError('Please choose which position you are applying for.');
    if (name.trim().length < 2) return setError('Please tell us your name.');
    if (!phone.trim() && !email.trim()) {
      return setError('Please leave a phone number or an email address so we can reach you.');
    }
    if (!startDate) return setError('Please tell us the earliest date you could start.');
    if (!days.length) return setError('Please tick the days of the week you are available to work.');
    if (!hours) return setError('Please tell us whether you are looking for full-time or part-time work.');
    if (asksShowroom && !showroom) return setError('Please tell us which showroom you would like to work at.');
    if (questions.some((q) => typeof screening[q.key] !== 'boolean')) {
      return setError('Please answer every yes-or-no question for this position.');
    }
    const filled = firstJob ? [] : jobs.filter(jobStarted);
    const half = filled.findIndex((j) => !jobComplete(j));
    if (half !== -1) {
      return setError(`Please fill in the employer, job title and dates for your ${half === 0 ? 'most recent' : 'previous'} job.`);
    }
    if (!firstJob && !filled.length) {
      return setError('Please tell us about your most recent job, or tick the box if this would be your first job.');
    }

    setState('sending');
    try {
      const resumeData = resume ? await readAsDataUrl(resume) : undefined;
      const res = await api.applyForJob({
        name: name.trim(),
        role_slug: role,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        company,
        form_version: FORM_VERSION,
        start_date: startDate,
        available_days: days,
        hours_wanted: hours,
        showroom: asksShowroom ? showroom : undefined,
        // Only the questions this role was shown. Answers left over from a
        // different role picked earlier must not ride along.
        screening: Object.fromEntries(questions.map((q) => [q.key, screening[q.key]])),
        first_job: firstJob,
        work_history: filled.map((j) => ({
          employer: j.employer.trim(), title: j.title.trim(), dates: j.dates.trim(),
          reason_left: j.reason_left.trim() || undefined,
        })),
        resume: resumeData,
        resume_name: resume?.name,
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

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-brand-charcoal bg-white ' +
    'focus:border-brand-yellow-dark focus:outline-none focus:ring-1 focus:ring-brand-yellow-dark';
  const label = 'block text-sm font-medium text-brand-charcoal mb-1';
  const req = <span className="text-red-600">*</span>;
  const section = 'sm:col-span-2 mt-4 pt-5 border-t border-gray-300';
  const sectionTitle = 'text-lg font-semibold text-brand-charcoal mb-1';
  const pill = (on: boolean) =>
    'px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none transition-colors ' +
    (on ? 'bg-brand-charcoal text-white border-brand-charcoal'
        : 'bg-white text-brand-charcoal border-gray-300 hover:border-brand-charcoal');

  return (
    <form onSubmit={submit} className="bg-brand-warm-gray rounded-2xl p-6 sm:p-10" noValidate>
      <h2 id="apply" className="text-2xl font-bold text-brand-charcoal mb-2">Apply Online</h2>
      <p className="text-sm text-brand-charcoal-light mb-6 leading-relaxed">
        About five minutes. No account needed, and a resume is optional — the questions below tell us
        what we need to know. Fields marked {req} are required.
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
        {/* ── About you ── */}
        <div className="sm:col-span-2">
          <label className={label} htmlFor="role">Position {req}</label>
          <select id="role" className={field} value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Choose a position…</option>
            {roles.map((r) => (
              <option key={r.slug} value={r.slug}>{r.title}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="name">Your name {req}</label>
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
          Phone or email {req} — one of the two is enough, whichever you would rather we used.
        </p>

        {/* ── Availability ── */}
        <div className={section}>
          <h3 className={sectionTitle}>Availability</h3>
        </div>

        <div>
          <label className={label} htmlFor="start_date">Earliest start date {req}</label>
          <input id="start_date" className={field} type="date" value={startDate}
            onChange={(e) => setStartDate(e.target.value)} required />
        </div>

        <fieldset>
          <legend className={label}>Looking for {req}</legend>
          <div className="flex flex-wrap gap-2">
            {HOURS.map(([k, l]) => (
              <label key={k} className={pill(hours === k)}>
                <input type="radio" name="hours_wanted" value={k} checked={hours === k}
                  onChange={() => setHours(k)} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="sm:col-span-2">
          <legend className={label}>Days you can work {req}</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(([k, l]) => (
              <label key={k} className={pill(days.includes(k))}>
                <input type="checkbox" checked={days.includes(k)} onChange={() => toggleDay(k)} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-brand-charcoal-light">We are open seven days a week. Tick every day you could work.</p>
        </fieldset>

        {asksShowroom && (
          <fieldset className="sm:col-span-2">
            <legend className={label}>Which showroom? {req}</legend>
            <div className="flex flex-wrap gap-2">
              {SHOWROOMS.map(([k, l]) => (
                <label key={k} className={pill(showroom === k)}>
                  <input type="radio" name="showroom" value={k} checked={showroom === k}
                    onChange={() => setShowroom(k)} className="sr-only" />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── Screening, per role ── */}
        <div className={section}>
          <h3 className={sectionTitle}>A few quick questions</h3>
          {!role && (
            <p className="text-sm text-brand-charcoal-light">Choose a position above and the questions for it will appear here.</p>
          )}
        </div>

        {role && questions.map((q) => (
          <fieldset key={q.key} className="sm:col-span-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <legend className="sr-only">{q.question}</legend>
            <span className="text-sm text-brand-charcoal" aria-hidden="true">{q.question} {req}</span>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <label key={String(v)} className={pill(screening[q.key] === v)}>
                  <input type="radio" name={q.key} checked={screening[q.key] === v}
                    onChange={() => setScreening((cur) => ({ ...cur, [q.key]: v }))} className="sr-only" />
                  {v ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {/* ── Work history ── */}
        <div className={section}>
          <h3 className={sectionTitle}>Work history</h3>
          <p className="text-sm text-brand-charcoal-light">Your most recent job, and one before it if you like.</p>
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-brand-charcoal cursor-pointer">
          <input type="checkbox" checked={firstJob} onChange={(e) => setFirstJob(e.target.checked)} />
          This would be my first job
        </label>

        {!firstJob && jobs.map((j, i) => (
          <div key={i} className="sm:col-span-2 grid gap-3 sm:grid-cols-2 rounded-xl border border-gray-300 bg-white/60 p-4">
            <div className="sm:col-span-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-brand-charcoal">
                {i === 0 ? 'Most recent job' : 'Previous job'}
              </span>
              {i > 0 && (
                <button type="button" className="text-xs text-brand-charcoal-light hover:underline"
                  onClick={() => setJobs((cur) => cur.filter((_, k) => k !== i))}>
                  Remove
                </button>
              )}
            </div>
            <div>
              <label className={label} htmlFor={`employer_${i}`}>Employer {req}</label>
              <input id={`employer_${i}`} className={field} value={j.employer}
                onChange={(e) => setJob(i, { employer: e.target.value })} autoComplete="organization" />
            </div>
            <div>
              <label className={label} htmlFor={`title_${i}`}>Job title {req}</label>
              <input id={`title_${i}`} className={field} value={j.title}
                onChange={(e) => setJob(i, { title: e.target.value })} autoComplete="organization-title" />
            </div>
            <div>
              <label className={label} htmlFor={`dates_${i}`}>Dates {req}</label>
              <input id={`dates_${i}`} className={field} value={j.dates}
                onChange={(e) => setJob(i, { dates: e.target.value })} placeholder="e.g. 2022 – present" />
            </div>
            <div>
              <label className={label} htmlFor={`reason_${i}`}>Why you left</label>
              <input id={`reason_${i}`} className={field} value={j.reason_left}
                onChange={(e) => setJob(i, { reason_left: e.target.value })}
                placeholder={i === 0 ? 'Leave blank if you still work there' : ''} />
            </div>
          </div>
        ))}

        {!firstJob && jobs.length < 2 && (
          <button type="button" className="sm:col-span-2 justify-self-start text-sm font-semibold text-brand-charcoal hover:underline"
            onClick={() => setJobs((cur) => [...cur, { ...EMPTY_JOB }])}>
            + Add a previous job
          </button>
        )}

        {/* ── Resume + anything else ── */}
        <div className={section}>
          <h3 className={sectionTitle}>Anything else</h3>
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="resume">Resume (optional)</label>
          <input id="resume" type="file" accept={RESUME_ACCEPT}
            onChange={(e) => pickResume(e.target.files?.[0] || null)}
            className="block w-full text-sm text-brand-charcoal file:mr-3 file:rounded-lg file:border-0 file:bg-brand-charcoal file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
          <p className="mt-1 text-xs text-brand-charcoal-light">PDF, Word, or a photo of it (JPG or PNG), up to 5 MB.</p>
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="message">Anything you&apos;d like us to know</label>
          <textarea id="message" className={field} rows={4} value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional." />
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
