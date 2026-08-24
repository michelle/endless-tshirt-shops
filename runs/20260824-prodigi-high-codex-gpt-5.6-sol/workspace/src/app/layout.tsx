import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store — wear this exact moment",
  description: "A made-to-order black tee printed with the Unix timestamp from your exact moment.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  openGraph: {
    title: "datetime.store",
    description: "We sell one t-shirt: your exact moment in time.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
