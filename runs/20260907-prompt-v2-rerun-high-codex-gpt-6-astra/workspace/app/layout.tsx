import type {Metadata} from 'next';
import {Header,Footer,StoreProvider} from '@/components/store';
import './globals.css';
export const metadata:Metadata={title:{default:'Off Hours Field Club — Good shirts. Better outside.',template:'%s | Off Hours Field Club'},description:'Original nature-inspired t-shirts for the hours that are yours. Meet the Off Hours Field Club. A sandbox storefront with test ordering.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><StoreProvider><a className="skip-link" href="#main">Skip to content</a><Header/>{children}<Footer/></StoreProvider></body></html>}
