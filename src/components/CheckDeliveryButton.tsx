'use client';

// ── CheckDeliveryButton ───────────────────────────────────────────────────
// Buries the "Can we deliver to you?" form behind a button so the home
// page hero stays clean. Renders:
//
//   * A button styled to match the hero's existing outline CTAs (Shop
//     Now / Build a Sectional). Clicking it opens the modal.
//   * A full-screen modal overlay containing the existing CheckDelivery
//     form component. Closes on X button click, backdrop click, or Esc.
//
// Intentionally a thin wrapper — all the form logic, availability
// rendering, lead capture, and four-way response handling stay inside
// CheckDelivery.tsx so the inline version (if we add one back later)
// and this modal version share identical behavior.

import { useState, useEffect } from 'react';
import CheckDelivery from './CheckDelivery';

export default function CheckDeliveryButton() {
  const [open, setOpen] = useState(false);

  // Close on Esc. Also lock body scroll while open so the modal doesn't
  // compete with the page for touch gestures on mobile.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Check Delivery Availability
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Check delivery availability"
          // Click on the backdrop (but not its contents) closes the modal.
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6 sm:py-12"
        >
          <div className="relative w-full max-w-3xl">
            {/* Close button — absolutely positioned so it floats in the
                top-right of the modal content regardless of what state
                the CheckDelivery form is in. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close delivery check"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-charcoal shadow-md hover:bg-white hover:shadow-lg transition-shadow"
            >
              <span className="text-lg leading-none">✕</span>
            </button>

            <CheckDelivery />
          </div>
        </div>
      )}
    </>
  );
}
