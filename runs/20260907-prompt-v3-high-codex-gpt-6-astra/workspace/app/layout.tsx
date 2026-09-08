import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { icons: {icon:'/favicon.svg'}, title: 'Personal Orbit — Wear a moment that matters', description: 'Your place, your date, your words. Turn a meaningful moment into a one-of-one, full-color orbit tee.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
