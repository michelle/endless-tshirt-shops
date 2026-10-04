import type { Metadata } from "next";
import { DM_Serif_Display, Barlow } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { CartLink } from "@/components/CartLink";

const display = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

const base = process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: "Overhead: tees printed with the sky from your moment", template: "%s · Overhead" },
  description:
    "Pick a date and a place. We compute the real night sky from that exact moment and print it on a soft cotton tee, made to order just for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const testMode = (process.env.STRIPE_SECRET_KEY ?? "").includes("_test_");
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {testMode && (
          <div className="testbanner">
            Demo mode: payments are simulated. Pay with card <b>4242 4242 4242 4242</b>, any future date, any CVC. Nothing is charged or shipped.
          </div>
        )}
        <header className="site">
          <Link href="/" className="brand" aria-label="Overhead home">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="9" cy="9" r="1.6" fill="currentColor" />
              <circle cx="17" cy="11" r="1.1" fill="currentColor" />
              <circle cx="13" cy="18" r="1.3" fill="currentColor" />
              <path d="M9 9L17 11L13 18" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
            <span>Overhead</span>
          </Link>
          <nav>
            <Link href="/#examples">Examples</Link>
            <Link href="/#how">How it works</Link>
            <Link href="/shipping-returns">Shipping</Link>
            <Link href="/design" className="btn small">Design yours</Link>
            <CartLink />
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site">
          <div>
            <b>Overhead</b>
            <p>Every shirt is printed once, just for you.</p>
          </div>
          <div className="links">
            <Link href="/shipping-returns">Shipping &amp; returns</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <p className="fine">
            Star data: Hipparcos/Yale Bright Star catalogues via d3-celestial. Cities: GeoNames (CC BY 4.0). Ephemerides: Astronomy Engine.
          </p>
        </footer>
      </body>
    </html>
  );
}
