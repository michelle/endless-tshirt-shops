import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Daymark — Wear a place worth keeping',description:'An original, made-for-you contour tee. Turn your favorite place, date, and words into a personal geography print.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
