import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'Nightmark — Wear the moment',description:'A one-of-one constellation tee made from your story, printed just for you.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
