import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'HERE — Wear Your Place',
    template: '%s · HERE',
  },
  description:
    'Custom-printed t-shirts that put the coordinates of the place that matters most on your chest. Made to order, printed on demand, shipped worldwide by Prodigi.',
  openGraph: {
    title: 'HERE — Wear Your Place',
    description: 'A made-for-you t-shirt featuring the coordinates of a place only you understand.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-ink antialiased">
        <header className="border-b border-ink/10 bg-bone/95 backdrop-blur sticky top-0 z-40">
          <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-serif tracking-tight text-xl">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-bone text-[11px] font-mono">N</span>
              <span>HERE</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/design" className="hover:text-rust">Design</Link>
              <Link href="/about" className="hover:text-rust">About</Link>
              <Link href="/design" className="hidden md:inline-flex bg-ink text-bone px-3 py-1.5 rounded-md hover:bg-rust transition-colors">
                Start yours →
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-24 border-t border-ink/10 bg-bone">
          <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-ink/70 grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-serif text-xl text-ink">HERE</div>
              <p className="mt-2 max-w-sm">A coordinates t-shirt. One you design from scratch — the place, the label, the year. Printed on demand by Prodigi.</p>
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-ink/60">How it works</div>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Pick a place & a label</li>
                <li>Choose color & size</li>
                <li>We print & ship it to you</li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Made possible by</div>
              <ul className="mt-2 space-y-1">
                <li>Next.js · Vercel</li>
                <li>Stripe · checkout</li>
                <li>Prodigi · print on demand</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-ink/10 py-4 text-center text-xs text-ink/50">
            © {new Date().getFullYear()} HERE. Every shirt is made to order.
          </div>
        </footer>
      </body>
    </html>
  );
}
