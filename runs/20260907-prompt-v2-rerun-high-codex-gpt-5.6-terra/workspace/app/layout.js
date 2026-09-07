import './globals.css';

export const metadata = {
  title: 'Night Shift Atlas — Shirts for the long way home',
  description: 'Limited-run, print-on-demand shirts for the nocturnal and curious.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
