import type { Metadata, Viewport } from 'next';

import { chivo } from '@/lib/fonts';

import './globals.css';

export const metadata: Metadata = {
  title: 'datetime.store — a t-shirt with the current datetime',
  description:
    'We sell exactly one thing: a black t-shirt printed with the unix millisecond timestamp of the moment you bought it. $22.50, free US shipping.',
  openGraph: {
    title: 'datetime.store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'datetime.store' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chivo.variable}>
      <body>{children}</body>
    </html>
  );
}
