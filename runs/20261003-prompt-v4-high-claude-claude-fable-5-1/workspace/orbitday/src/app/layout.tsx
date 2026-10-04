import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbitday — the solar system, the day you arrived",
  description:
    "A one-of-a-kind t-shirt showing exactly where every planet was on your date. Birthdays, anniversaries, the day you met. Printed to order on 100% cotton.",
  openGraph: {
    title: "Orbitday — the solar system, the day you arrived",
    description: "Every planet, exactly where it was on your date. Printed to order.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="container nav">
          <Link href="/" className="brand">
            <span className="brand-dot" aria-hidden />
            Orbitday
          </Link>
          <nav className="nav-links">
            <Link href="/#how">How it works</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/design" className="btn btn-ghost" style={{ padding: "9px 18px", fontSize: 14 }}>
              Design yours
            </Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="container footer">
          <div>© {new Date().getFullYear()} Orbitday. Printed to order with direct-to-garment ink on Bella+Canvas 3001 tees.</div>
          <div>Planet positions computed from JPL approximate orbital elements (1900–2050). Moon phase accurate to within a few hours.</div>
        </footer>
      </body>
    </html>
  );
}
