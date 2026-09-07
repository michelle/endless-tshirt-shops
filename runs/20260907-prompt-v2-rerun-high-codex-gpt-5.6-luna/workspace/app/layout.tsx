import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Night Market Signal — Drop 01', description: 'Graphic tees for the long way home. Small-batch, made-to-order streetwear.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
