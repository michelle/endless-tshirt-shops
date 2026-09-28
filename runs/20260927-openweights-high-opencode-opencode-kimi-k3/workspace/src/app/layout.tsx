import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sidereal — Wear the sky of your moment',
  description:
    'A t-shirt printed with the exact night sky above your most important moment. Real star positions, computed from the Yale Bright Star Catalog, printed on demand.',
};

export const viewport: Viewport = {
  themeColor: '#0a0d14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand display">
            SIDEREAL
          </Link>
          <nav>
            <Link href="/#how">How it works</Link>
            <Link href="/#shirt">The shirt</Link>
            <Link href="/design" className="btn btn-small">
              Create yours
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="display" style={{ letterSpacing: '0.3em' }}>
            SIDEREAL
          </div>
          <p>
            Every chart is computed from real star positions (Yale Bright Star Catalog) for your
            exact moment and place. Printed on demand with water-based DTG inks and shipped
            worldwide by Prodigi&apos;s print network.
          </p>
          <p className="muted small">
            Star data: Yale Bright Star Catalog · Constellation lines: d3-celestial · Cities:
            GeoNames · Typeface: Marcellus (OFL)
          </p>
        </footer>
      </body>
    </html>
  );
}
