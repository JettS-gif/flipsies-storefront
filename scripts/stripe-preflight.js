/**
 * Stripe go-live preflight — reproduces the exact throw the storefront's
 * /api/create-payment-intent hits, locally, so we can NAME the config cause
 * instead of guessing from Vercel logs.
 *
 * Run from the flipsies-storefront dir with the LIVE secret key in the env
 * (paste it inline; it is NOT read from any file and NOT committed):
 *
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-preflight.js
 *
 * Optional: also validate the webhook secret shape:
 *   STRIPE_SECRET_KEY=sk_live_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx node scripts/stripe-preflight.js
 *
 * Read-only + self-cleaning: it retrieves the account, then creates a $1
 * PaymentIntent EXACTLY as the storefront does and immediately cancels it.
 * No charge is ever confirmed, so no money moves.
 */
const Stripe = require('stripe');

function line() { console.log('─'.repeat(64)); }

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('✗ STRIPE_SECRET_KEY not set. Run:');
    console.error('    STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-preflight.js');
    process.exit(2);
  }

  const mode = key.startsWith('sk_live_') ? 'LIVE'
    : key.startsWith('sk_test_') ? 'TEST'
    : key.startsWith('rk_') ? 'RESTRICTED'
    : 'UNKNOWN';
  line();
  console.log(`Key prefix: ${key.slice(0, 8)}…   Mode: ${mode}`);
  if (mode === 'UNKNOWN') {
    console.error('✗ Key does not look like a Stripe secret key (expected sk_live_/sk_test_/rk_).');
  }
  if (mode === 'TEST') {
    console.log('⚠  This is a TEST key. Real checkouts on the live site need sk_live_ on Vercel.');
  }
  line();

  const stripe = new Stripe(key);

  // 1) Account status — is this account allowed to take live charges?
  try {
    const acct = await stripe.accounts.retrieve();
    console.log('Account:', acct.id, acct.business_profile?.name || acct.email || '');
    console.log('  charges_enabled :', acct.charges_enabled);
    console.log('  payouts_enabled :', acct.payouts_enabled);
    console.log('  details_submitted:', acct.details_submitted);
    if (acct.requirements?.currently_due?.length) {
      console.log('  ⚠ requirements.currently_due:', acct.requirements.currently_due.join(', '));
    }
    if (acct.requirements?.disabled_reason) {
      console.log('  ✗ disabled_reason:', acct.requirements.disabled_reason);
    }
    if (mode === 'LIVE' && !acct.charges_enabled) {
      console.log('  → DIAGNOSIS: live charges are DISABLED. Finish activation (business');
      console.log('    profile / bank / identity) in the Stripe dashboard. This is the throw.');
    }
  } catch (err) {
    console.error('✗ accounts.retrieve() failed:', err.type, err.code || '', '-', err.message);
    if (err.type === 'StripeAuthenticationError') {
      console.error('  → DIAGNOSIS: the key itself is invalid/mismatched. On Vercel this shows');
      console.error('    as "Invalid API Key" — set the correct sk_live_ and redeploy.');
    }
    process.exit(1);
  }
  line();

  // 2) The exact call the storefront makes (create-payment-intent/route.ts:109).
  console.log('Attempting $1.00 PaymentIntent (same params as the storefront)…');
  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { invoice_id: 'preflight', invoice_number: 'PREFLIGHT' },
      description: 'Flipsies preflight — auto-cancelled, never charged',
    });
    console.log('✓ PaymentIntent created:', pi.id, '(status:', pi.status + ')');
    console.log('  → PaymentIntent creation WORKS. If the live site still fails, the key is');
    console.log('    missing/wrong ON VERCEL specifically (env not set or not redeployed).');
  } catch (err) {
    console.error('✗ paymentIntents.create() THREW — this is the storefront failure:');
    console.error('    type   :', err.type);
    console.error('    code   :', err.code || '(none)');
    console.error('    message:', err.message);
    if (/activate|charges|not.*enabled/i.test(err.message)) {
      console.error('  → DIAGNOSIS: account not activated for live charges. Finish activation.');
    }
    process.exit(1);
  }

  // Clean up the throwaway PI (unconfirmed, but cancel to leave nothing dangling).
  try {
    await stripe.paymentIntents.cancel(pi.id);
    console.log('  (preflight PaymentIntent cancelled — nothing left on the account)');
  } catch { /* harmless: unconfirmed PIs expire on their own */ }
  line();

  // 3) Webhook secret shape (only if provided — can't fully validate without an event).
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (whsec) {
    console.log('Webhook secret provided:', whsec.startsWith('whsec_')
      ? '✓ shape OK (whsec_…). Confirm the SAME value is on Vercel AND Railway.'
      : '✗ does not start with whsec_ — wrong value.');
  } else {
    console.log('No STRIPE_WEBHOOK_SECRET passed. Remember it must be set on BOTH Vercel');
    console.log('and Railway (the backend re-verifies the signature independently).');
  }
  line();
  console.log('Preflight done. If everything above is ✓, the live checkout will work.');
}

main().catch(e => { console.error('Unexpected preflight error:', e); process.exit(1); });
