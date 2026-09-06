import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { CartLink } from "@/components/CartLink";
import { markUrl } from "@/lib/art";

export const metadata: Metadata = {
  title: "Automata Supply — wearable cellular automata",
  description:
    "T-shirts printed with elementary cellular automata. 256 rules, every seed, rendered at print resolution and made to order.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <header className="site-header">
            <div className="wrap">
              <a href="/" className="brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="brand-mark"
                  src={markUrl(
                    { rule: 90, seed: "000001", seeding: "single", ink: "bone", cells: 15 },
                    120,
                  )}
                  alt=""
                />
                <span className="brand-name">Automata Supply</span>
              </a>
              <nav className="nav">
                <a href="/#catalog">Catalog</a>
                <a href="/design">Design yours</a>
                <a href="/about">About</a>
                <CartLink />
              </nav>
            </div>
          </header>

          <main>{children}</main>

          <footer className="site-footer">
            <div className="wrap">
              <span>Automata Supply — printed on demand, one rule at a time.</span>
              <span>
                Gildan 64000 · DTG · fulfilled by Prodigi · payments by Stripe
              </span>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
