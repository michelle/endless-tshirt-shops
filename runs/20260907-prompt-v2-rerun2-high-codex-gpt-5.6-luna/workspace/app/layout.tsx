import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Nightshift Supply — Wear the static', description: 'Limited-run signal graphics for the hours nobody sees.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
