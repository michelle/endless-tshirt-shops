import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal / Noise — Wear your frequency",
  description: "A one-of-one DTG tee generated from the phrase only you would choose.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
