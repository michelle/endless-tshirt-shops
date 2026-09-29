import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar — Custom Star Map Tees",
  description:
    "Wear the sky from the night that mattered. A custom star map of any date and place, printed on a premium tee just for you.",
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
