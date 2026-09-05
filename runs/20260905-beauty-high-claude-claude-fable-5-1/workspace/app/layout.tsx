import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Space_Mono } from "next/font/google";
import "./globals.css";
import Sky from "@/components/Sky";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const mono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "datetime.store — we sell a t-shirt with the current datetime",
  description:
    "Every shirt is printed with the exact millisecond you bought it. One of one. Free shipping. Time is on sale.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime. Whatever it says when you press the button is what you get.",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b0d1f",
  width: "device-width",
  initialScale: 1,
};

/** Set the time-of-day palette before first paint so there's no flash. */
const daypartScript = `(function(){try{var h=new Date().getHours();var d=h<5?'night':h<8?'dawn':h<17?'day':h<20?'dusk':'night';document.documentElement.setAttribute('data-daypart',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-daypart="night" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: daypartScript }} />
      </head>
      <body className={`${serif.variable} ${mono.variable}`}>
        <Sky />
        {children}
      </body>
    </html>
  );
}
