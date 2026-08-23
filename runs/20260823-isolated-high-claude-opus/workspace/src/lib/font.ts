import { Chivo } from 'next/font/google';

/**
 * Chivo is the typeface the timestamp is printed in, on the shirt and on the
 * screen. Loading it through next/font means `chivo.style.fontFamily` gives us
 * the exact resolved family name, which the canvas that renders the print
 * artwork needs in order to measure glyphs correctly.
 */
export const chivo = Chivo({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-chivo',
});
