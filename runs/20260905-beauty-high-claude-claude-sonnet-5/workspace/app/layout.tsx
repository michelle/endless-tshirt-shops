import type { Metadata } from 'next';
import { display, sans, mono } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'datetime.store — wear this exact moment',
  description:
    'One t-shirt design. Infinite moments. datetime.store prints the precise second you check out, down to the millisecond — then it is gone forever. Fulfilled with Prodigi, powered by Stripe.',
  openGraph: {
    title: 'datetime.store',
    description: 'The t-shirt that is different every single time. Frozen at the moment of purchase.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-aurora font-sans antialiased">{children}</body>
    </html>
  );
}
