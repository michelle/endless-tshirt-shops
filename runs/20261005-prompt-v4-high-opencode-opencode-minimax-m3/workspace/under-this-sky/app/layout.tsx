import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Under This Sky — personalized celestial apparel",
  description:
    "A direct-to-garment t-shirt printed with the night sky above the moment that matters to you.",
};

export const viewport: Viewport = {
  themeColor: "#040a18",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-inkDeep text-parchment font-serif antialiased selection:bg-gold/40 selection:text-ink">
        {children}
      </body>
    </html>
  );
}
