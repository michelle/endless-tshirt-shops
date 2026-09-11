import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sidereal — the sky above your moment, printed on a shirt",
  description:
    "Pick a place, a date and a time. We chart the exact stars that were overhead and print it, in full colour, on a shirt made for one person: you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-display text-2xl tracking-wide text-star">
              Sidereal
            </Link>
            <nav className="flex items-center gap-6 text-sm text-mist">
              <Link href="/#how" className="hover:text-fog">How it works</Link>
              <Link href="/design" className="rounded-md bg-star px-4 py-2 text-night hover:bg-white">
                Chart your sky
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-mist sm:flex-row sm:items-center sm:justify-between">
            <p>
              Sidereal · Printed to order with direct-to-garment ink on Bella + Canvas 3001 tees. Star positions from the
              Yale Bright Star Catalogue via d3-celestial.
            </p>
            <p className="font-mono">Every shirt is a one-off.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
