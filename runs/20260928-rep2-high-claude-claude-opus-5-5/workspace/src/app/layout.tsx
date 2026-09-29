import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overhead — the sky from your moment, printed on a tee",
  description:
    "Custom star map t-shirts. Pick a place and a moment — we calculate the exact sky overhead, Moon phase and planets included, and print it on a premium tee.",
};

function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="#e8c27a" strokeWidth="1.6" />
      <path d="M16 6 L17.6 14.4 L26 16 L17.6 17.6 L16 26 L14.4 17.6 L6 16 L14.4 14.4Z" fill="#f3ecdd" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <nav className="nav">
            <Link href="/" className="logo">
              <Logo /> Overhead
            </Link>
            <div className="nav-links">
              <Link href="/#how">How it works</Link>
              <Link href="/#gallery">Gallery</Link>
              <Link href="/#faq">FAQ</Link>
              <Link href="/design">Design yours</Link>
            </div>
          </nav>
        </div>
        {children}
        <footer className="footer">
          <div className="wrap">
            © {new Date().getFullYear()} Overhead · Star positions computed with astronomy-engine; star catalogue from
            d3-celestial (Yale Bright Star / Hipparcos). Printed on demand by Prodigi. Payments by Stripe.
          </div>
        </footer>
      </body>
    </html>
  );
}
