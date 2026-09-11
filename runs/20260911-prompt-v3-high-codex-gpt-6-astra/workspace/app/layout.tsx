import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AFTER HOURS — Your life. The tour tee.',
  description:
    'A one-of-one tour tee for the life you actually live. Turn your people, places and memories into a personalized full-color print.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
