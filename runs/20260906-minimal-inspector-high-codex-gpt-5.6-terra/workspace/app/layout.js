import './globals.css';

export const metadata = {
  title: 'datetime.store — a t-shirt with the current datetime',
  description: 'A single black t-shirt, printed with the exact moment you buy it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
