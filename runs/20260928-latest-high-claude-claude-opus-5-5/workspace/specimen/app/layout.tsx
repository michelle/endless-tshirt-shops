import type { Metadata } from "next";
import "./globals.css";
import { CartProvider, BagLink } from "@/components/cart-store";

export const metadata: Metadata = {
  title: "SPECIMEN — you are a rare species",
  description:
    "One-of-one natural-history tees. Describe a person (or pet) and we generate a never-before-seen moth, butterfly or beetle with a Latin name and field notes, printed in full color.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <header className="site-header">
            <div className="wrap">
              <a className="brand" href="/">
                <b>SPECIMEN</b>
                <i className="hide-sm">field guide to rare species</i>
              </a>
              <nav className="nav">
                <a href="/#gallery" className="hide-sm">
                  Gallery
                </a>
                <a href="/design">Design yours</a>
                <BagLink />
              </nav>
            </div>
          </header>
          {children}
          <footer className="site-footer">
            <div className="wrap">
              <span>SPECIMEN · one-of-one tees, printed on demand · Every shirt is 1 of 1.</span>
              <span>
                Payments by Stripe · Printed &amp; shipped by Prodigi · <a href="/#faq">FAQ</a>
              </span>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
