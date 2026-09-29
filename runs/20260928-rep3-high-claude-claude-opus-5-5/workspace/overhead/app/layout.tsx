import type { Metadata } from "next";
import Link from "next/link";
import { BagLink } from "@/components/BagLink";
import { StarMark } from "@/components/Logo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overhead — the sky above your moment, on a shirt",
  description:
    "Custom star-map t-shirts. Pick a date, time and place — we compute the exact sky above it, stars, moon and planets, and print it on a premium tee.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="logo" aria-label="Overhead home">
              <StarMark />
              Overhead
            </Link>
            <nav className="nav">
              <Link href="/#how" className="hide-sm">How it works</Link>
              <Link href="/#faq" className="hide-sm">FAQ</Link>
              <Link href="/design">Design yours</Link>
              <BagLink />
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <span>© {new Date().getFullYear()} Overhead · Printed on demand, one sky at a time.</span>
            <span>Star data: Yale Bright Star Catalogue via d3-celestial · Ephemeris: astronomy-engine</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
