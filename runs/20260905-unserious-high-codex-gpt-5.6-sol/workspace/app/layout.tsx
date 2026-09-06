import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'datetime.store — own a millisecond',
  description:
    'A black t-shirt printed with the exact Unix timestamp from the moment you bought it. Extremely current. Briefly.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
