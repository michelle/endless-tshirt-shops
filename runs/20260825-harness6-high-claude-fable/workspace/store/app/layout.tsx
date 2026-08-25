import type { Metadata } from 'next';
import { Chivo } from 'next/font/google';
import './globals.css';

const chivo = Chivo({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-chivo',
});

export const metadata: Metadata = {
  title: 'the datetime store',
  description:
    'we sell a t-shirt with the current datetime. Every shirt is one of a kind: the exact millisecond you buy it, printed forever.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏱</text></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={chivo.variable}>{children}</body>
    </html>
  );
}
