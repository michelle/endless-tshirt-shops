import type { Metadata } from 'next';
import { DM_Sans, Space_Mono } from 'next/font/google';
import './globals.css';

const sans = DM_Sans({ variable: '--font-sans', subsets: ['latin'] });
const mono = Space_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Night Shift Field Club — Original nocturnal field-art tees',
  description: 'Original field-art shirts inspired by the creatures, coastlines, and skies that come alive after dark.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
