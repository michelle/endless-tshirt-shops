import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meridian — Sky Keepsake Tees",
  description:
    "A t-shirt printed with the exact sky from your moment: real sun path, moon phase and stars for any place and time on Earth. Printed to order with DTG.",
};

export const viewport: Viewport = {
  themeColor: "#0c1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
