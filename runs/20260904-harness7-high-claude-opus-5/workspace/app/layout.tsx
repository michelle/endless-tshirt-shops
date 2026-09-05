import type { Metadata, Viewport } from 'next';
import { Chivo } from 'next/font/google';
import './globals.css';

const chivo = Chivo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-chivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'datetime.store',
  description: 'We sell a t-shirt with the current datetime. One shirt, one moment, yours.',
  openGraph: {
    title: 'datetime.store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
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
