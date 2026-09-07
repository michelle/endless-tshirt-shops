import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/catalog";
import { paymentMode, siteUrl } from "@/lib/site";

const display = localFont({ src: "../../fonts/AlfaSlabOne.ttf", variable: "--font-display", display: "swap" });
const condensed = localFont({
  src: [
    { path: "../../fonts/BarlowCondensed-Medium.ttf", weight: "500" },
    { path: "../../fonts/BarlowCondensed-SemiBold.ttf", weight: "600" },
  ],
  variable: "--font-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${STORE_NAME} · Official Park Service Tees`, template: `%s · ${STORE_NAME}` },
  description: STORE_TAGLINE,
  openGraph: { title: STORE_NAME, description: STORE_TAGLINE, images: ["/art/dial-up-canyon.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${condensed.variable}`}>
      <body>
        <CartProvider>
          <Header sandbox={paymentMode() === "sandbox"} />
          <main className="main">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
