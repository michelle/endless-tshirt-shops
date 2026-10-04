import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RESONA — One-of-One Generative Tees',
  description:
    'Every RESONA tee is generated from your name: original artwork, printed one at a time with direct-to-garment technology. No two shirts are alike.',
  openGraph: {
    title: 'RESONA — One-of-One Generative Tees',
    description: 'Wear your name in light. Original, generative, printed on demand.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Montserrat:wght@300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
