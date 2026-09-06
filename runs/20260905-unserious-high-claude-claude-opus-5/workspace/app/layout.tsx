import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'datetime.store — we sell a t-shirt with the current datetime',
  description:
    'A t-shirt printed with the exact millisecond you bought it. One thousand new designs every second. Never restocked, for reasons that should be obvious.',
  openGraph: {
    title: 'datetime.store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
