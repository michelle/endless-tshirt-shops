import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellara — Wear the night that mattered",
  description:
    "Custom star map t-shirts. The exact night sky from the moment that changed everything, printed on demand just for you.",
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
