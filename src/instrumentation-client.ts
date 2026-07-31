import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.options";

// Browser Sentry init. Runs before the app becomes interactive.
//
// The DSN must be NEXT_PUBLIC_ here — Next inlines it into the client bundle at
// BUILD time, so setting it in Vercel after a deploy does nothing until the
// next build. A DSN is a write-only ingest endpoint, so publishing it is the
// intended design, not a leak.
//
// Session Replay is deliberately absent: it is not a default integration, and
// adding it would record the checkout form. Card fields are Stripe iframes and
// safe, but name/address/phone are ours and would be captured.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init(
    sentryOptions(
      process.env.NEXT_PUBLIC_SENTRY_DSN,
      process.env.NEXT_PUBLIC_VERCEL_ENV,
    ),
  );
}

// Ties client-side route changes to the errors they produce. Exported
// unconditionally — it is a no-op when init above was skipped.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
