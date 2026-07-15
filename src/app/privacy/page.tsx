import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'Flipsies Furniture privacy policy — what we collect, how we use it, and your rights.',
  path: '/privacy',
});

const LAST_UPDATED = 'June 4, 2026';
const STORE_EMAIL  = 'info@flipsiesfurniture.com';
const STORE_PHONE  = '(205) 238-5076';
const STORE_ADDR   = '1811 Crestwood Blvd, Irondale, AL 35210';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Privacy Policy</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="prose prose-sm max-w-none space-y-6 text-brand-charcoal-light leading-relaxed">
        <p>
          Flipsies Furniture (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) operates retail showrooms in
          Hoover and Irondale, Alabama, and the website at
          flipsiesfurniture.com. This policy explains what personal
          information we collect, how we use it, and the choices you have
          about that information.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">Information We Collect</h2>
          <p>When you shop with us — online or in person — we collect:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-brand-charcoal">Contact details</strong> — name, email address, phone number, and delivery address.</li>
            <li><strong className="text-brand-charcoal">Order details</strong> — items purchased, delivery preferences, special instructions.</li>
            <li><strong className="text-brand-charcoal">Payment details</strong> — handled directly by our payment processor (Stripe); we do not store full card numbers on our servers.</li>
            <li><strong className="text-brand-charcoal">Tax-exemption documentation</strong> — for customers eligible for tax-exempt purchases, the certificate you provide.</li>
            <li><strong className="text-brand-charcoal">Communications</strong> — SMS / email confirmations, scheduling notes, and any messages you send our staff.</li>
            <li><strong className="text-brand-charcoal">Site usage</strong> — anonymous server logs, the products you scan via QR code in our showrooms, and basic device information needed to deliver pages.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">How We Use It</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Process your order and deliver the furniture you bought.</li>
            <li>Send order confirmations, delivery scheduling updates, pickup notifications, and post-delivery follow-up via SMS or email.</li>
            <li>Match purchases to your existing customer record so returns, store credit, and warranty service work seamlessly.</li>
            <li>Comply with state sales-tax reporting and federal recordkeeping requirements.</li>
            <li>Improve store operations — which products customers ask about most, which delivery routes need more capacity, where our service falls short.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">Who Receives Your Information</h2>
          <p>We share the minimum necessary with these service providers:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-brand-charcoal">Stripe</strong> — payment processing (subject to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-yellow-dark hover:underline">Stripe&apos;s privacy policy</a>).</li>
            <li><strong className="text-brand-charcoal">Twilio</strong> — SMS delivery notifications and one-time-passcode login for our staff app.</li>
            <li><strong className="text-brand-charcoal">Our furniture vendors</strong> — name and shipping address only, when an item is drop-shipped or back-ordered through them.</li>
            <li><strong className="text-brand-charcoal">Financing partners (Synchrony, Progressive Leasing, 1st Franklin Financial)</strong> — only the information you submit in their applications, and only when you choose to apply.</li>
          </ul>
          <p className="mt-3">
            We do not sell your personal information. We do not share it for third-party advertising.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">SMS Messaging</h2>
          <p>
            If you provide a phone number, we may send delivery scheduling
            updates, pickup-ready notifications, and order status messages
            by SMS. Message and data rates may apply. Reply STOP to opt
            out of further messages at any time; reply HELP for support.
            Opting out of texts will not affect your order, but our team
            may need to follow up by phone instead.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">How Long We Keep It</h2>
          <p>
            Order records, tax-exemption certificates, and financial
            records are retained for at least seven years to satisfy
            tax and accounting requirements. Marketing-only contact
            records (for example, an inquiry that didn&apos;t turn into a
            sale) are kept no longer than is useful for follow-up, and
            you can request deletion at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">Your Choices</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Request a copy of the personal information we have on file for you.</li>
            <li>Correct anything that&apos;s wrong.</li>
            <li>Delete information we&apos;re not required to keep for tax / legal reasons.</li>
            <li>Stop SMS messages by replying STOP, or email us to stop other communications.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these, contact us at the address below.
            We respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">Children</h2>
          <p>
            Our website is not directed to children under 13, and we do
            not knowingly collect information from them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">Changes to This Policy</h2>
          <p>
            We may update this policy as our practices change. The
            &quot;Last updated&quot; date at the top reflects the most
            recent revision.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">Contact Us</h2>
          <p>
            Questions about this policy or how we handle your information:
          </p>
          <address className="not-italic mt-2">
            <p>Flipsies Furniture</p>
            <p>{STORE_ADDR}</p>
            <p>Phone: <a href={`tel:${STORE_PHONE.replace(/\D/g, '')}`} className="text-brand-yellow-dark hover:underline">{STORE_PHONE}</a></p>
            <p>Email: <a href={`mailto:${STORE_EMAIL}`} className="text-brand-yellow-dark hover:underline">{STORE_EMAIL}</a></p>
          </address>
        </section>
      </div>
    </div>
  );
}
