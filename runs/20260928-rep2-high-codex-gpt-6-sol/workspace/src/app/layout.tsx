import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Our Orbit — A story you can wear', description: 'Design a one-of-a-kind constellation tee from your names, place, date, and message. Printed just for you.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
