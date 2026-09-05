import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'datetime.store — Wear this very moment.',description:'A timestamp. A t-shirt. Yours. Capture the current moment on a black, made-to-order tee.',metadataBase:new URL(process.env.APP_URL || 'http://localhost:3000'),openGraph:{title:'Wear this very moment. — datetime.store',description:'A timestamp. A t-shirt. Yours.',type:'website',images:[{url:'/og.png',width:1536,height:1024,alt:'Wear this very moment. A timestamp. A t-shirt. Yours.'}]},twitter:{card:'summary_large_image',images:['/og.png']}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
