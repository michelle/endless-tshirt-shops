import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const mono = localFont({
  src: '../public/fonts/mono.ttf',
  variable: '--font-mono',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'datetime.store — A moment. A t-shirt.',
  description:
    'A black t-shirt with the current Unix timestamp. Choose your fit, capture a moment, and wear it. Printed just for you.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={mono.variable}>{children}</body>
    </html>
  );
}
