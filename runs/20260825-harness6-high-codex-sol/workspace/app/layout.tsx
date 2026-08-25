import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store — Wear this exact moment",
  description: "A one-of-one black tee printed with the exact Unix timestamp from the moment you buy it.",
  metadataBase: new URL("https://datetime.store"),
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f2ed",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
