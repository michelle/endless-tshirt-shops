import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Isle of You - a sea chart of one person, printed on a shirt',
  description:
    'Answer six questions and we engrave the island that is you: your port, your mountain, your bay, and the thing in the deep water. One chart, one shirt, no second impression.',
  openGraph: {
    title: 'The Isle of You',
    description: 'A hand-engraved sea chart of one person. Yours.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <footer className="foot">
          <div className="wrap">
            The Atlas of Persons &#183; engraved to order, printed direct-to-garment
            <br />
            Demonstration storefront. Payments run in Stripe test mode; printing runs in the
            Prodigi sandbox.
          </div>
        </footer>
      </body>
    </html>
  );
}
