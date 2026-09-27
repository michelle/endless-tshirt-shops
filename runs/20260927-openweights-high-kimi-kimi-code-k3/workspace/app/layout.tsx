import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StarMark — Wear Your Moment",
  description:
    "A one-of-a-kind t-shirt printed with the exact night sky of your most important moment. Choose the date, time and place — we chart the stars and print it on demand.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
