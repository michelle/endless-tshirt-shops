import './globals.css';

export const metadata = {
  title: 'datetime.store — a moment, made physical',
  description: 'We sell a t-shirt with the current datetime.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
