import Link from 'next/link';
import * as React from 'react';

export function Header() {
  return (
    <header className="border-b border-ink-800/80 bg-ink-950/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="11" cy="11" r="2.5" stroke="#d4a857" />
                <circle cx="11" cy="11" r="6" />
                <circle cx="11" cy="11" r="9.5" strokeDasharray="2 4" />
                <line x1="11" y1="0.5" x2="11" y2="3.2" />
                <line x1="11" y1="18.8" x2="11" y2="21.5" />
                <line x1="0.5" y1="11" x2="3.2" y2="11" />
                <line x1="18.8" y1="11" x2="21.5" y2="11" />
              </g>
            </svg>
            <span className="font-display text-2xl tracking-wide">
              STAR<span className="text-gold-500">PRINT</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/#how-it-works" className="text-ink-300 hover:text-ink-100">
              How it works
            </Link>
            <Link href="/#story" className="text-ink-300 hover:text-ink-100">
              Our story
            </Link>
            <Link href="/design" className="btn-primary text-sm">
              Design yours
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
