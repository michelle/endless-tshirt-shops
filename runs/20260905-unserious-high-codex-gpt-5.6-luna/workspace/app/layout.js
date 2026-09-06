import './globals.css';

export const metadata = {
  title: 'datetime.store — the shirt that knows what time it is',
  description: 'A very limited shirt, printed with the exact millisecond you order it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
