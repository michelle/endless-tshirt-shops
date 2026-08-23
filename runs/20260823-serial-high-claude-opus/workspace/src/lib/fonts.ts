import localFont from 'next/font/local';

/**
 * Chivo is the typeface the original store printed with, and the same TTF is
 * used by the server-side artwork renderer — so the preview on screen is a true
 * representation of the print.
 */
export const chivo = localFont({
  src: [
    { path: '../../public/fonts/Chivo-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Chivo-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Chivo-Black.ttf', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-chivo',
});
