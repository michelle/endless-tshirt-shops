import type { Metadata } from 'next';
import { Chivo } from 'next/font/google';

import './globals.css';

const chivo = Chivo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-chivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'datetime.store — a t-shirt with the current datetime',
  description:
    'We sell a t-shirt printed with the exact epoch millisecond you bought it. $22.50, free shipping.',
  openGraph: {
    title: 'datetime.store',
    description: 'We sell a t-shirt with the current datetime.',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${chivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
