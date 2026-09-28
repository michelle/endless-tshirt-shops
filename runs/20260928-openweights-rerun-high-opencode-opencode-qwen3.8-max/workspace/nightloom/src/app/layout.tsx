import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

const base =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: 'Nightloom — wear the night you were born',
  description:
    'One-of-one star map tees. Tell us a name, a night and a place — we chart the real sky from that moment and print it, just for you, direct-to-garment.',
  openGraph: {
    title: 'Nightloom — wear the night you were born',
    description:
      'One-of-one star map tees, generated from your name, date and place. Real stars, printed to order.',
    url: base,
    siteName: 'Nightloom',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Nightloom star map tee' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nightloom — wear the night you were born',
    description: 'One-of-one star map tees, generated from your name, date and place.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="starfield" aria-hidden="true" />
        <header className="sticky top-0 z-40 border-b hairline backdrop-blur-md bg-[rgba(5,8,26,0.72)]">
          <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#b99a5a" strokeWidth="3" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="#b99a5a" strokeWidth="1" opacity="0.5" />
                <path
                  d="M50 26 L54.5 45.5 L74 50 L54.5 54.5 L50 74 L45.5 54.5 L26 50 L45.5 45.5 Z"
                  fill="#e0c68f"
                />
                <circle cx="66" cy="34" r="2.6" fill="#f3eee3" />
                <circle cx="35" cy="63" r="2" fill="#f3eee3" opacity="0.8" />
              </svg>
              <span className="font-display text-[17px] tracking-[0.34em] uppercase text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors">
                Nightloom
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-[12px] tracked muted">
              <Link href="/#studio" className="hover:text-[var(--gold)] transition-colors">Design yours</Link>
              <Link href="/#how" className="hover:text-[var(--gold)] transition-colors">How it works</Link>
              <Link href="/#tee" className="hover:text-[var(--gold)] transition-colors">The tee</Link>
              <Link href="/#faq" className="hover:text-[var(--gold)] transition-colors">FAQ</Link>
            </nav>
            <Link href="/#studio" className="nl-btn nl-btn-ghost !py-2 !px-4 text-[11px]">
              Start a shirt
            </Link>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t hairline mt-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8 py-12 grid gap-8 md:grid-cols-3 text-[13px]">
            <div>
              <div className="font-display tracking-[0.3em] uppercase text-[15px] mb-3">Nightloom</div>
              <p className="muted leading-relaxed max-w-xs">
                One-of-one star map tees, charted from real catalog stars and printed to order
                with direct-to-garment ink. No two shirts alike — because no two nights are.
              </p>
            </div>
            <div className="muted">
              <div className="tracked text-[11px] mb-3 text-[var(--ink)]">Good to know</div>
              <ul className="space-y-2 leading-relaxed">
                <li>Printed &amp; shipped by Prodigi, 119 countries</li>
                <li>Bella+Canvas 3001 · 100% combed cotton · 4.2 oz</li>
                <li>Made to order — ships in 3–6 business days</li>
                <li>Every shirt is custom: final sale</li>
              </ul>
            </div>
            <div className="muted">
              <div className="tracked text-[11px] mb-3 text-[var(--ink)]">Star data</div>
              <p className="leading-relaxed max-w-xs">
                Skies computed from the HYG star catalog (Astronexus, CC&nbsp;BY-SA) with
                constellation figures after the IAU western sky culture. Positions are
                precessed to your exact date.
              </p>
            </div>
          </div>
          <div className="border-t hairline">
            <div className="mx-auto max-w-7xl px-5 md:px-8 py-5 flex flex-col md:flex-row gap-2 justify-between text-[11px] tracked faint">
              <span>© {new Date().getFullYear()} Nightloom</span>
              <span>woven from light · printed to order</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
