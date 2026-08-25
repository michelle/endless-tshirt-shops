import type { Metadata, Viewport } from 'next';
import { Chivo } from 'next/font/google';

import { siteOrigin } from '@/lib/site';

import './globals.css';

const chivo = Chivo({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-stamp',
  display: 'swap',
});

const UI_STACK =
  '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, Arial, sans-serif';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: 'the datetime store',
  description:
    'We sell a t-shirt with the current datetime. Pick a millisecond, we print that exact number and mail it to you.',
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
    <html lang="en" className={chivo.variable}>
      <body style={{ ['--font-ui' as string]: UI_STACK }}>{children}</body>
    </html>
  );
}
