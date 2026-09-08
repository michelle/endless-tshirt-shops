import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "The Order of Small Disasters — Patron Saints tees",
    template: "%s · The Order of Small Disasters",
  },
  description:
    "Hand-drawn devotional icons for modern minor catastrophes: the unread inbox, the last two percent, the buttered side down. Printed to order on soft cotton tees.",
  openGraph: {
    title: "The Order of Small Disasters",
    description: "Patron saints for the catastrophes that never make the news.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sandbox = (process.env.PRODIGI_API_BASE ?? "sandbox").includes("sandbox");
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header sandbox={sandbox} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
