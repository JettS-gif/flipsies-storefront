import Link from 'next/link';

// The SMS consent for the customer-account text-code sign-in. ONE copy, used by
// /account/login and the gift card page (/gift/[code]) — both send the same texts,
// so the wording must not drift between them. A2P 10DLC requires an explicit,
// non-pre-checked checkbox at the point we collect the number.
export default function PortalSmsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-xs text-brand-charcoal-light leading-relaxed cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 flex-shrink-0 h-4 w-4 accent-brand-yellow"
      />
      <span>
        I agree to receive account, order, delivery, and review-request
        text messages from Flipsies Furniture at the number provided,
        including a one-time login code. Consent is not a condition of
        purchase. Msg &amp; data rates may apply; message frequency varies.
        Reply STOP to opt out, HELP for help. See our{' '}
        <Link href="/terms" className="underline hover:text-brand-charcoal">SMS Terms</Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-brand-charcoal">Privacy Policy</Link>.
      </span>
    </label>
  );
}
