import './globals.css';

export const metadata = {
  title: 'datetime.store — the shirt with the current time',
  description: 'A limited-run tee printed with the exact moment you ordered it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
