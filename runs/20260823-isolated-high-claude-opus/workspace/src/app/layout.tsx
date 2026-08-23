import type { Metadata } from 'next';
import { chivo } from '@/lib/font';
import './globals.css';

const TITLE = 'the datetime store';
const DESCRIPTION =
  'We sell a t-shirt with the current datetime on it. The moment you buy is the moment you get — printed to the millisecond, and yours alone.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
  icons: {
    icon: [
      {
        url:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#111"/><circle cx="16" cy="16" r="9" fill="none" stroke="#a4d5ff" stroke-width="2.5"/><path d="M16 10.5V16l4 2.5" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
          ),
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chivo.variable}>
      <body>{children}</body>
    </html>
  );
}
