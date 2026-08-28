import './globals.css';

export const metadata = {
  title: 'datetime.store — a t-shirt from this exact moment',
  description: 'A black t-shirt printed with the exact millisecond you make it yours.',
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
