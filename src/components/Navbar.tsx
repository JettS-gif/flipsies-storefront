'use client';

import Link from 'next/link';
import { useState } from 'react';
import SearchBar from './SearchBar';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/sectionals', label: 'Sectionals' },
  { href: '/deals', label: 'Deals' },
  { href: '/locations', label: 'Locations' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-brand-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.jpg"
              alt="Flipsies Furniture"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-brand-charcoal-light hover:text-brand-charcoal transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <SearchBar />
            <Link href="/cart" className="relative p-2 hover:bg-brand-warm-gray rounded-lg transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-medium text-brand-charcoal-light hover:text-brand-charcoal transition-colors"
            >
              Sign in
            </Link>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 hover:bg-brand-warm-gray rounded-lg"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-brand-border py-4 space-y-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-sm font-medium text-brand-charcoal-light hover:bg-brand-warm-gray rounded-lg"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="block px-3 py-2.5 text-sm font-medium text-brand-charcoal-light hover:bg-brand-warm-gray rounded-lg"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
