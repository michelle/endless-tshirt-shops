import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: "datetime.store — Time flies. Wear it.",
  description:
    "A souvenir of right now. Capture a moment in time on a soft cotton tee, printed just for you. One timestamp. Endless stories.",
  openGraph: {
    title: "Time flies. Wear it.",
    description:
      "A souvenir of right now. Your exact moment, printed on a tee.",
    images: ["/og.png"],
    type: "website",
    siteName: "datetime.store",
  },
  twitter: {
    card: "summary_large_image",
    title: "Time flies. Wear it.",
    description:
      "A souvenir of right now. Your exact moment, printed on a tee.",
    images: ["/og.png"],
  },
  robots: {
    index: process.env.NEXT_PUBLIC_STORE_MODE === "live",
    follow: true,
  },
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
