import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Field Notes — Wear your somewhere',description:'A personalized landscape tee for the places that stay with you. Your place, your words, your original design.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
