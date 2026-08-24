import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'the datetime store',
  description: 'We sell a t-shirt with the current datetime. Printed with the exact millisecond you bought it.',
  openGraph: {
    title: 'the datetime store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

/** A clock, in place of the original's Bootstrap `glyphicon-time`. */
function Clock() {
  return (
    <svg
      className="clock"
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 5.5V10l3 2" strokeLinecap="round" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="page">
          <header className="masthead">
            <h1>
              <Link href="/">datetime.store</Link>
            </h1>
            <p>
              we sell a t-shirt with the current datetime. <Clock />
            </p>
          </header>
          {children}
          <footer className="footer">
            <p>
              One product, infinite variants. Printed on demand and shipped worldwide by{' '}
              <a href="https://www.prodigi.com" target="_blank" rel="noreferrer">
                Prodigi
              </a>
              . Payments by{' '}
              <a href="https://stripe.com" target="_blank" rel="noreferrer">
                Stripe
              </a>
              .
            </p>
            <p>
              A rebuild of{' '}
              <a
                href="https://github.com/michelle/datetime.store"
                target="_blank"
                rel="noreferrer"
              >
                michelle/datetime.store
              </a>
              .
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
