import './globals.css';

export const metadata = {
  title: 'datetime.store — wear this exact moment',
  description: 'A black t-shirt printed with the exact Unix timestamp when you ordered it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
