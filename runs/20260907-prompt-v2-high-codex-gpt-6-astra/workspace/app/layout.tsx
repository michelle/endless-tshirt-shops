import type {Metadata} from 'next';
import './globals.css';
import {StoreProvider} from './store';
export const metadata:Metadata={title:{default:'Out of Office Club — Wear your away message',template:'%s | Out of Office Club'},description:'Original graphic tees for scenic routes, quieter weekends, and a life beyond the inbox. The first Out of Office Club collection.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><StoreProvider>{children}</StoreProvider></body></html>}
