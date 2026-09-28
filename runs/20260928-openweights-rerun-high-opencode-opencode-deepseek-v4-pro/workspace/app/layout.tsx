import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lunaria — The moon, exactly as it was on your night',
  description:
    'Custom moon-phase t-shirts, printed on demand. Choose a date, add your words, and wear the exact moon from the night that mattered.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
