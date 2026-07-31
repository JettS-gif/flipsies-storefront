// Shared Sentry init options for the three runtimes (node, edge, browser).
//
// Kept in one place so the privacy posture can't drift between them — the
// storefront is the surface that touches real customer data, so a setting that
// silently applies to only two of the three runtimes is the failure mode worth
// designing against.
//
// Deliberately NOT set here: `release`. withSentryConfig injects its own
// release identifier at build time and keys uploaded source maps to it;
// setting a different value by hand makes every uploaded map fail to match and
// silently gives us minified traces back.

type SentryEnv = "production" | "preview" | "development";

function resolveEnvironment(vercelEnv: string | undefined): SentryEnv {
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return "development";
}

export function sentryOptions(dsn: string, vercelEnv: string | undefined) {
  return {
    dsn,

    // Preview deploys and local dev report separately from real customer
    // traffic, so an alert rule can scope to production without muting
    // everything else.
    environment: resolveEnvironment(vercelEnv),

    // Errors only. Tracing is enabled account-side but unsampled — flip to 0.1
    // if we ever chase a checkout latency question. Sampling costs quota, and
    // we have no latency investigation running.
    tracesSampleRate: 0,

    // Our own console output is not forwarded; what gets shipped to Sentry
    // should be a deliberate choice rather than the whole stream.
    enableLogs: false,

    dataCollection: {
      // The PII decision. Checkout and cart request bodies carry customer
      // names, phones, delivery addresses, and order contents. Card data never
      // touches our origin (Stripe iframes), but the rest does — and none of it
      // is needed to read a stack trace.
      httpBodies: [],
      cookies: false,
      userInfo: false,
    },
  };
}
