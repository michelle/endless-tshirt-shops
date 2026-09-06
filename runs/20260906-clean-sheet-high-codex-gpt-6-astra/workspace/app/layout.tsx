import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Night Shift — Shirts for people who look up',description:'Original astronomy tees for backyard observers, lunar obsessives, and the unofficial Pluto fan club.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
