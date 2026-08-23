import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'datetime.store — wear the moment',
  description: 'A t-shirt with the current datetime, printed on demand.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
