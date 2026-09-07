import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'Amateur Weather Club — Good shirts. Questionable forecasts.',
 description: 'Original graphic tees for a life outside. Meet the Amateur Weather Club: made-to-order cotton shirts for rain lovers and cloud watchers.',
 robots: { index: false, follow: false },
};
export default function RootLayout({children}: {children: React.ReactNode}) {
 return <html lang="en"><body>{children}</body></html>;
}
