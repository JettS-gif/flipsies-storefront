import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Flipsies Furniture terms of service — what you can expect when shopping with us and what we ask of you.',
};

const LAST_UPDATED = 'June 4, 2026';
const STORE_EMAIL  = 'info@flipsiesfurniture.com';
const STORE_PHONE  = '(205) 238-5076';
const STORE_ADDR   = '1811 Crestwood Blvd, Irondale, AL 35210';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Terms of Service</h1>
        <p className="text-sm text-brand-charcoal-light mt-2">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="prose prose-sm max-w-none space-y-6 text-brand-charcoal-light leading-relaxed">
        <p>
          These terms govern your use of flipsiesfurniture.com (the
          &quot;Site&quot;) and any purchases you make from Flipsies
          Furniture, with showrooms at 2929 John Hawkins Pkwy, Hoover,
          AL 35244 and {STORE_ADDR}. By using the Site or placing an
          order, you agree to these terms.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">1. Products and Pricing</h2>
          <p>
            We try to describe every item accurately, but slight
            differences in color, fabric, and dimensions can occur — wood
            grain varies, fabric dyes shift batch-to-batch, and a couch
            measured in our showroom may sit a quarter-inch off catalog
            spec. If something looks materially different than described,
            contact us and we&apos;ll make it right.
          </p>
          <p className="mt-3">
            Prices are in U.S. dollars and exclude sales tax and delivery
            unless stated. We may correct pricing errors at any time
            before an order is finalized; if a corrected price is
            materially higher than what you accepted, we&apos;ll cancel and
            refund rather than charge the higher amount.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">2. Orders and Payment</h2>
          <p>
            Placing an order online creates an offer to purchase. We
            accept that offer when we charge your card and confirm the
            order. Until then, we reserve the right to decline an order
            (for example, if an item sells out between adding to cart
            and checkout, if a price was clearly listed in error, or if
            we cannot verify payment).
          </p>
          <p className="mt-3">
            We accept major credit and debit cards online. In our
            showrooms we also accept cash, check, and financing through
            Synchrony, Progressive Leasing, and 1st Franklin Financial.
            Financing applications are subject to the partner&apos;s own
            approval — we do not control or guarantee approval.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">3. Sales Tax</h2>
          <p>
            We collect Alabama state and local sales tax based on the
            delivery address (for delivery orders) or the showroom
            location (for pickup orders). Tax-exempt customers must
            provide a valid certificate; expired certificates revert to
            standard tax until renewed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">4. Delivery and Pickup</h2>
          <p>
            We deliver in-house within 50 miles of our Irondale
            warehouse. Beyond that range, we can sometimes arrange
            third-party freight — call us to discuss. Delivery windows
            are estimates; we&apos;ll keep you posted by SMS or phone
            and refund any unused delivery fee if we can&apos;t complete
            the delivery in the agreed window.
          </p>
          <p className="mt-3">
            Pickup orders should be claimed within 14 days of the order
            being ready. After 14 days we may apply a reasonable
            storage fee or restock the item; we&apos;ll always try to
            reach you first.
          </p>
          <p className="mt-3">
            At delivery, please inspect every piece before our team
            leaves. Visible damage noted on the delivery receipt is
            addressed under our warranty; damage reported later is
            handled case-by-case.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">5. Returns and Exchanges</h2>
          <p>
            <strong className="text-brand-charcoal">In-stock items:</strong>
            {' '}exchange or return for store credit within 7 days of
            delivery / pickup, provided the item is in its original
            condition. A restocking fee may apply on items showing
            wear.
          </p>
          <p className="mt-3">
            <strong className="text-brand-charcoal">Custom-order and special-order items:</strong>
            {' '}non-returnable except for manufacturer defects. Custom
            orders are made to your specifications and cannot be resold
            as new. The deposit on a custom order is non-refundable
            once production has started.
          </p>
          <p className="mt-3">
            <strong className="text-brand-charcoal">Defects and warranty:</strong>
            {' '}we honor the manufacturer&apos;s warranty on every piece
            we sell. Bring documentation and photos to either showroom
            and we&apos;ll coordinate with the manufacturer.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">6. Promotions and Financing Offers</h2>
          <p>
            Promotional pricing, sale events, and financing
            promotions are subject to the terms displayed at the time
            of the offer. Promotional financing requires approval from
            the financing partner and is governed by that partner&apos;s
            agreement, not these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">7. Using the Site</h2>
          <p>
            You agree not to interfere with the Site&apos;s operation,
            scrape product data in bulk for resale, attempt to defeat
            authentication or pricing controls, or use the Site to
            transmit malware. The Site, its content, and the Flipsies
            Furniture name and logo are our property.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by Alabama law, our total
            liability to you for any claim arising out of an order or
            your use of the Site is limited to the amount you paid us
            for the order in question. We are not liable for indirect
            or consequential damages (for example, time off work
            waiting for a delivery, or rental costs).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">9. Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of
            Alabama. Any dispute that isn&apos;t resolved between us
            directly will be brought in the courts located in
            Jefferson County, Alabama.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">10. Changes</h2>
          <p>
            We may update these terms periodically. The
            &quot;Last updated&quot; date at the top reflects the most
            recent revision. Continued use of the Site after a change
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-charcoal mt-8 mb-2">Contact</h2>
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
