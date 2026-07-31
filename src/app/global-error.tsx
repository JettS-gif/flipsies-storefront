"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

// Root-level error boundary. This replaces the ROOT LAYOUT when it fails, so it
// renders its own <html>/<body> and cannot use Navbar/Footer — they live in the
// layout that just died. globals.css is imported explicitly for the same
// reason: the layout that normally pulls it in is not rendering.
//
// Errors this catches are the ones that break the whole page, which on a store
// taking real money is exactly the class we must not learn about from a phone
// call. Everything narrower is caught by Sentry's automatic instrumentation.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-6xl mb-6">🛋</div>
          <h1 className="text-3xl font-bold text-brand-charcoal mb-4">
            Something went wrong
          </h1>
          <p className="text-brand-charcoal-light mb-8 max-w-md mx-auto">
            We hit an unexpected error on our end. It has been reported and
            we&apos;re looking into it — please try again.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-brand"
            >
              Try Again
            </button>
            <a href="/" className="btn-outline">
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
