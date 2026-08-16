import './globals.css';

export const metadata = {
  title: 'datetime.store — a shirt from right now',
  description: 'We sell a t-shirt with the current datetime.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
