import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MANTRA — Wear Your Word',
  description: 'One word. One shirt. Yours alone. A one-of-one DTG printed tee, made to order.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Libre+Baskerville:wght@700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
