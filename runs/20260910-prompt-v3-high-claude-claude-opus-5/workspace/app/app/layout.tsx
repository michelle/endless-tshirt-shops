import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flora Personalis — a botanical field guide to human beings',
  description:
    'Every person is a species. Give us a name, a date and a place and we draw the plant that only you could be — then print that single specimen plate on a shirt, one at a time.',
  openGraph: {
    title: 'Flora Personalis',
    description: 'Every person is a species. One name, one date, one place — one specimen plate, printed once.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Courier+Prime:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-head">
          <Link href="/" className="wordmark">
            <span className="wordmark-main">Flora Personalis</span>
            <span className="wordmark-sub">Herbarium of persons · est. 2026</span>
          </Link>
          <nav className="site-nav">
            <Link href="/#how">How it works</Link>
            <Link href="/#gallery">Specimens</Link>
            <Link href="/design" className="nav-cta">
              Collect yours
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <div className="foot-rule" />
          <div className="foot-grid">
            <div>
              <strong>Flora Personalis</strong>
              <p>
                Every plate is drawn to order from a single name, date and place, then printed
                direct-to-garment as an edition of one. No stock, no minimums, nothing warehoused.
              </p>
            </div>
            <div>
              <strong>Printing &amp; delivery</strong>
              <p>
                Gildan 64000 unisex softstyle, 100% ring-spun cotton. Pressed and shipped by Prodigi
                from the facility nearest you. Delivery is quoted live at checkout.
              </p>
            </div>
            <div>
              <strong>Questions</strong>
              <p>
                Write to <a href="mailto:hello@florapersonalis.example">hello@florapersonalis.example</a>.
                Payments are handled by Stripe; we never see your card details.
              </p>
            </div>
          </div>
          <p className="foot-fine">
            Demonstration storefront. Payments run against Stripe test keys and printing against the
            Prodigi sandbox — no card is charged and no shirt is actually pressed.
          </p>
        </footer>
      </body>
    </html>
  );
}
