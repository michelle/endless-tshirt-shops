import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orrery — the solar system on your day, printed on a tee",
  description: "Pick a date. We compute exactly where every planet was and print it, with your words, direct to garment. No two shirts alike.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen starfield">{children}</body>
    </html>
  );
}
