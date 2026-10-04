import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'STARPRINT — Wear the sky from your moment',
  description:
    'Personalized celestial apparel. Each shirt is printed on demand from the night sky at the place and moment that matters most.',
  openGraph: {
    title: 'STARPRINT — Wear the sky from your moment',
    description: 'Personalized celestial apparel, printed on demand.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen bg-ink-950 text-ink-100 antialiased selection:bg-gold-500/40 selection:text-ink-100">
        {children}
      </body>
    </html>
  );
}
