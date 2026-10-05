import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Elsewhere — Wear your somewhere',description:'Turn your favorite place into a one-of-one landscape tee. Personalize your place, date, palette, and a little memory.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
