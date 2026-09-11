import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../lib/fonts/Inter-400.ttf", weight: "400", style: "normal" },
    { path: "../lib/fonts/Inter-600.ttf", weight: "600", style: "normal" },
    { path: "../lib/fonts/Inter-800.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interchange - your life, drawn as a transit map",
  description:
    "Design the transit map of your own life and wear it. Every shirt is generated from your stops, printed one at a time, direct to garment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
