import { Chivo } from 'next/font/google';

/** Shared so the <html> class and the canvas print renderer agree on the face. */
export const chivo = Chivo({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
  variable: '--font-chivo',
});
