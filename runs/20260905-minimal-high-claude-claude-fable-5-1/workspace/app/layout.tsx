import type { Metadata, Viewport } from "next";
import { Chivo } from "next/font/google";
import "./globals.css";

const chivo = Chivo({ subsets: ["latin"], weight: ["500"], variable: "--font-chivo", display: "swap" });

export const metadata: Metadata = {
  title: "the datetime store",
  description: "We sell a t-shirt with the current datetime. Yours is printed with the exact millisecond you bought it.",
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime.",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chivo.variable}>
      <body>{children}</body>
    </html>
  );
}
