import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Fieldnote — Wear your somewhere.',referrer:'no-referrer',description:'An original landscape tee, made from your place, your moment, and your words. Personalized and printed one at a time.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
