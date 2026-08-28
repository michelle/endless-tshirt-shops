import type { Metadata, Viewport } from 'next';
import { Chivo, Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const chivo = Chivo({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-chivo',
  display: 'swap',
});

const metadataBase = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : new URL('http://localhost:3000');

export const metadata: Metadata = {
  metadataBase,
  title: 'datetime.store — we sell a t-shirt with the current datetime',
  description:
    'A black t-shirt printed with the exact millisecond you bought it. One product, one moment, printed on demand and shipped free in the US.',
  openGraph: {
    title: 'datetime.store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${chivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
