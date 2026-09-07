import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { CartProvider } from '@/components/CartProvider';
import Header from '@/components/Header';

const ORIGIN = process.env.SITE_ORIGIN ?? 'https://benchmark-20260907-prompt-v2-high-c-nu.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: 'Last Shift — apparel for jobs that no longer exist',
  description:
    'Union-style crests for extinct trades: knocker-uppers, lamplighters, switchboard operators, ice cutters, human computers and log drivers. Printed on demand, shipped worldwide.',
  openGraph: {
    title: 'Last Shift',
    description: 'Union-style crests for six extinct trades. Printed on demand, shipped worldwide.',
    type: 'website',
    images: ['/og.png'],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <footer className="site-foot">
            <div className="wrap site-foot-in">
              <div>
                <strong className="serif" style={{ letterSpacing: '.14em' }}>LAST SHIFT</strong>
                <div style={{ marginTop: 4 }}>Apparel for jobs that no longer exist.</div>
              </div>
              <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
                <Link href="/about">Why these six</Link>
                <Link href="/#shirts">The Register</Link>
                <Link href="/cart">Cart</Link>
              </div>
              <div>Printed &amp; shipped on demand · Free worldwide shipping</div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
