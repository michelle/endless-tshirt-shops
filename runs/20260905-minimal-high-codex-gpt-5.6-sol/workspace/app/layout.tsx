import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://datetime.store",
  ),
  title: "datetime.store — wear the current moment",
  description: "A black t-shirt printed with the exact millisecond you buy it.",
  openGraph: {
    title: "datetime.store — wear the current moment",
    description: "A black t-shirt printed with the exact millisecond you buy it.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "datetime.store black timestamp t-shirt" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "datetime.store — wear the current moment",
    description: "A black t-shirt printed with the exact millisecond you buy it.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
