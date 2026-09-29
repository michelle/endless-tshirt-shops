import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Sonder Studio — Wear your moment', description: 'A custom moment map tee, made from your place, date, and words.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
