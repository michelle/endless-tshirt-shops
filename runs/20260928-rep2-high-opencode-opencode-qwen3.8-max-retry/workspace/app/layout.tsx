import type { Metadata } from 'next';
import { inter, cormorant } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Moonworn — the night you love, worn',
  description:
    'Pick the date and place that changed everything. We print that night — the moon in its true phase, a sky seeded from your moment — one-of-one on a premium tee with direct-to-garment ink.',
  keywords: ['personalised t-shirt', 'moon phase', 'night sky', 'DTG', 'custom apparel', 'gift'],
  openGraph: {
    title: 'Moonworn — the night you love, worn',
    description:
      'One date. One place. One sky that was yours alone. Your moment, printed one-of-one with direct-to-garment ink.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-night-950 text-mist-100 antialiased">{children}</body>
    </html>
  );
}
