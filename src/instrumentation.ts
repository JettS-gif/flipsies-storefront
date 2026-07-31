import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.options";

// Server + edge runtime Sentry init. Next calls `register()` once per server
// instance before the first request is handled.
//
// Init is gated on SENTRY_DSN: unset ⇒ no init ⇒ zero behaviour change. Same
// fail-safe the backend uses, so a missing env var on a preview deploy degrades
// to "monitoring off" rather than a boot failure.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  const options = sentryOptions(process.env.SENTRY_DSN, process.env.VERCEL_ENV);

  // NEXT_RUNTIME distinguishes the node server from the edge runtime; both run
  // this file, and initialising the wrong SDK build in either is a no-op at
  // best. Middleware and edge routes report through the edge branch.
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(options);
  }
}

// Server-side render/route errors. Next hands these to Sentry's own handler,
// which attaches the request context (route, method) that a bare
// captureException would lose.
export const onRequestError = Sentry.captureRequestError;
