import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AETHEL CELESTIAL | Bespoke Night Sky DTG T-Shirt Studio',
  description:
    'Custom astronomical star map t-shirts printed with archival DTG technology on Bella + Canvas 3001. Immortalize life’s greatest moments under the exact stars.',
  openGraph: {
    title: 'AETHEL CELESTIAL | Bespoke Night Sky DTG T-Shirts',
    description:
      'Every Moment Has a Sky. Wear Yours. Personalized astronomical star chart t-shirts printed on demand with high-resolution direct-to-garment technology.'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080a0f] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
