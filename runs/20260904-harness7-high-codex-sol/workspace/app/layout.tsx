import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: "datetime.store — A timestamp you can wear",
  description: "A one-of-one black cotton T-shirt printed with the exact Unix timestamp from the moment you order.",
  openGraph: {
    title: "datetime.store — A timestamp you can wear",
    description: "The exact millisecond you checked out, printed on a one-of-one T-shirt.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "A black datetime.store timestamp T-shirt" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "datetime.store — A timestamp you can wear",
    description: "The exact millisecond you checked out, printed on a one-of-one T-shirt.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
