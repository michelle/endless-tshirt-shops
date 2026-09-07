import './globals.css';

export const metadata = {
  title: 'datetime.store — the present, printed',
  description: 'A t-shirt with the current datetime, down to the millisecond.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
