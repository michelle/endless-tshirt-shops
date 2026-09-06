import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'https://datetime.store'),
  title: 'datetime.store — Wear right now. Forever.',
  description: 'A black t-shirt. The current Unix timestamp. A completely unnecessary way to hold on to a moment. Pick your fit and capture right now.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
