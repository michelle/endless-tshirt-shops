import localFont from 'next/font/local';

export const inter = localFont({
  src: [
    { path: '../assets/fonts/inter-latin-400-normal.woff', weight: '400', style: 'normal' },
    { path: '../assets/fonts/inter-latin-500-normal.woff', weight: '500', style: 'normal' },
    { path: '../assets/fonts/inter-latin-600-normal.woff', weight: '600', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

export const cormorant = localFont({
  src: [
    { path: '../assets/fonts/cormorant-garamond-latin-400-normal.woff', weight: '400', style: 'normal' },
    { path: '../assets/fonts/cormorant-garamond-latin-500-normal.woff', weight: '500', style: 'normal' },
    { path: '../assets/fonts/cormorant-garamond-latin-600-normal.woff', weight: '600', style: 'normal' },
    { path: '../assets/fonts/cormorant-garamond-latin-400-italic.woff', weight: '400', style: 'italic' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
});
