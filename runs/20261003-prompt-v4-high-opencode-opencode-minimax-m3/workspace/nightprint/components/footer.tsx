import * as React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-32 border-t border-ink-800/80">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-6 text-xs uppercase tracking-widest text-ink-400 md:flex-row">
          <span>✨ STARPRINT · Wear the sky from your moment ✨</span>
          <div className="flex items-center gap-6">
            <Link href="/api/healthz" className="hover:text-ink-200">
              System status
            </Link>
            <a href="https://www.prodigi.com" className="hover:text-ink-200" target="_blank" rel="noreferrer">
              Powered by Prodigi
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
