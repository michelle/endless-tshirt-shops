import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Under These Stars — the real night sky of your moment, printed on a tee",
  description:
    "A custom t-shirt showing the exact night sky above the place and moment that mattered: a first date, a birth, a wedding, a farewell. Astronomically accurate, printed to order with direct-to-garment ink.",
  openGraph: {
    title: "Under These Stars",
    description: "The real night sky of your moment, printed on a tee.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-display text-lg tracking-[0.25em] text-fg uppercase">
              Under These Stars
            </Link>
            <nav className="flex items-center gap-6 text-sm text-muted">
              <Link href="/#design" className="hover:text-fg">
                Design yours
              </Link>
              <Link href="/#how" className="hover:text-fg">
                How it works
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Under These Stars. Printed to order with direct-to-garment ink.</p>
            <p>Star positions from the Yale Bright Star Catalogue via d3-celestial. Payments by Stripe.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
