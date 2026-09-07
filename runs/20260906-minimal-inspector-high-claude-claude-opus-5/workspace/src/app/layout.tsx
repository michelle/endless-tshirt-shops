import type { Metadata, Viewport } from 'next';
import { Chivo } from 'next/font/google';
import { siteOrigin } from '@/lib/env';
import './globals.css';

const chivo = Chivo({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-chivo',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: 'the datetime store',
  description: 'We sell a t-shirt with the current datetime. Printed with the exact millisecond you bought it.',
  openGraph: {
    title: 'the datetime store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'A black t-shirt printed with the current time in milliseconds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'the datetime store',
    description: 'We sell a t-shirt with the current datetime.',
    images: ['/api/og'],
  },
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
