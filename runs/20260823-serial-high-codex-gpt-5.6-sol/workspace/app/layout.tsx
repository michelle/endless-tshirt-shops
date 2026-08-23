import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://datetime.store"),
  title: "datetime.store — wear this exact moment",
  description: "A made-to-order black tee printed with the exact Unix timestamp from the moment you buy it.",
  openGraph: {
    title: "datetime.store",
    description: "This exact moment, printed forever.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f2efe8",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
