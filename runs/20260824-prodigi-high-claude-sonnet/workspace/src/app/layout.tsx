import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceMono = localFont({
  src: [
    { path: "../fonts/SpaceMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/SpaceMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "datetime.store — the shirt that shows the exact moment you bought it",
  description:
    "A t-shirt printed with the precise date, time, and millisecond you placed your order. Unisex or fitted, S–XL, printed and shipped by Prodigi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
