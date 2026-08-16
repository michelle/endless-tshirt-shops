import type { Metadata, Viewport } from 'next';
import { chivo } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'the datetime store',
  description: 'We sell a t-shirt with the current datetime. One of a kind, by definition.',
  openGraph: {
    title: 'the datetime store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chivo.variable}>
      <body>{children}</body>
    </html>
  );
}
