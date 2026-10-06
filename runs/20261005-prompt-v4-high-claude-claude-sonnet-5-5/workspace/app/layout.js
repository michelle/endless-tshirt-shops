import { Cormorant_Garamond, Jost } from 'next/font/google';
import './globals.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--serif' });
const sans = Jost({ subsets: ['latin'], weight: ['400', '500'], variable: '--sans' });

export const metadata = {
  title: 'Skyprint — the night sky from the night that mattered, printed on a tee',
  description:
    'Custom star-map t-shirts. Enter a date and place — a birth, a wedding, a first kiss — and we print the exact sky above that moment on a premium tee, made just for you.',
};

export const viewport = { themeColor: '#0b1226' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
