import type { Metadata } from 'next';
import './globals.css';
import { PRESETS } from '@/lib/presets';
import { encodeDesign } from '@/lib/design';

const heroDesign = PRESETS[0].design; // the Matterhorn
const heroRender = `/api/render?d=${encodeURIComponent(encodeDesign(heroDesign))}&w=1200`;

function siteUrl(): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Lay of the Land — wear the shape of your place',
    template: '%s — Lay of the Land',
  },
  description:
    'Custom topographic contour t-shirts, generated from real terrain data for any place on Earth. Your place, your story, printed on demand with DTG.',
  openGraph: {
    title: 'Lay of the Land — wear the shape of your place',
    description:
      'Custom topographic contour t-shirts generated from real terrain data. Pick any place on Earth — we turn it into wearable cartography.',
    images: [{ url: heroRender, width: 1200, height: 1689 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="sandbox-banner">
          Sandbox build — payments are simulated and printing runs against Prodigi&rsquo;s test lab. No
          real shirts, no real charges.
        </div>
        {children}
      </body>
    </html>
  );
}
