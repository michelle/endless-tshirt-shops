import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartStore";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Cipher Tees — Wear Your Own Code",
  description:
    "Turn your own words into a one-of-one generative pattern, printed to order on a DTG tee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteHeader />
          <main>{children}</main>
          <footer className="site-footer">
            <div className="container">
              <p>
                Cipher Tees · Printed on demand via direct-to-garment (Prodigi sandbox) · Payments
                by Stripe (test mode) · Demo storefront — no real shirts ship from this build.
              </p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
