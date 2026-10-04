import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbital — the solar system on your day, printed on a tee",
  description:
    "A one-of-a-kind t-shirt showing exactly where every planet was on the date that matters to you. Printed to order with direct-to-garment ink.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0b0b10] text-[#f1ece0]">{children}</body>
    </html>
  );
}
