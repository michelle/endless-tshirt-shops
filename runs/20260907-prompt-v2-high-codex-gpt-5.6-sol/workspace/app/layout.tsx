import type { Metadata } from 'next';
import { Archivo, Archivo_Black, Space_Mono } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'] });
const archivoBlack = Archivo_Black({ variable: '--font-display', weight: '400', subsets: ['latin'] });
const spaceMono = Space_Mono({ variable: '--font-mono-custom', weight: ['400', '700'], subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Afterglow Supply Co. — Tees for the quiet hours',
  description: 'Original, made-to-order t-shirts inspired by lost broadcasts, lunar static, and the hours after midnight.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${archivoBlack.variable} ${spaceMono.variable}`}>{children}</body>
    </html>
  );
}
