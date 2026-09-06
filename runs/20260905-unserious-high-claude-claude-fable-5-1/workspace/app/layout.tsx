import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const chivo = localFont({
  src: [
    { path: "../assets/fonts/Chivo-Regular.ttf", weight: "400", style: "normal" },
    { path: "../assets/fonts/Chivo-Medium.ttf", weight: "500", style: "normal" },
    { path: "../assets/fonts/Chivo-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-chivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "datetime.store",
  description: "we sell a t-shirt with the current datetime.",
  openGraph: {
    title: "datetime.store",
    description: "we sell a t-shirt with the current datetime. ⏱",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chivo.variable}>
      <body>{children}</body>
    </html>
  );
}
