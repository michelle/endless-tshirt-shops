import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Starryborn — wear the night you were born',
  description:
    'Personalised star-chart t-shirts. Tell us the moment and place you were born and we compute the real sky — every star, constellation and the phase of the moon — then print it on a premium tee, made just for you.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
