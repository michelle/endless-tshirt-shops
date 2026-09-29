import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Little Night Garden — a shirt grown just for you', description: 'A wearable field study, made from your name, a meaningful place, and a date you love. Printed on demand on organic cotton.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
