import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "datetime.store — Wear this exact moment",
  description: "A made-to-order black tee printed with one exact millisecond in time.",
  openGraph: {
    title: "datetime.store",
    description: "Wear this exact moment.",
    type: "website"
  },
  icons: { icon: "/icon.svg" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f0e9"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
