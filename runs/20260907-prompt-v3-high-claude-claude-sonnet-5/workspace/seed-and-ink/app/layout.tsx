import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seed & Ink — one-of-one, DTG-printed tees',
  description:
    'Type a phrase. We grow a one-of-one generative design from it and print it directly on a shirt, just for you.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-ink-700/60">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-tight">
                <span className="inline-block w-2 h-2 rounded-full bg-seed-500" />
                Seed &amp; Ink
              </Link>
              <nav className="flex items-center gap-6 text-sm text-neutral-300">
                <Link href="/customize" className="hover:text-white transition">
                  Design yours
                </Link>
                <a
                  href="#how-it-works"
                  className="hidden sm:inline hover:text-white transition"
                >
                  How it works
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-ink-700/60 text-neutral-500 text-xs">
            <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <p>Seed &amp; Ink — printed on demand, one at a time.</p>
              <p>Sandbox build — test mode only, no real charges or shipments.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
