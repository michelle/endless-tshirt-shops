import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "datetime.store — Wear this exact moment",
  description: "A one-of-one t-shirt printed with the exact millisecond you bought it.",
  openGraph: { title: "datetime.store — Wear this exact moment", description: "A one-of-one t-shirt printed with the exact millisecond you bought it.", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "datetime.store — Wear this exact moment", description: "A one-of-one t-shirt printed with the exact millisecond you bought it.", images: ["/og.png"] },
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
