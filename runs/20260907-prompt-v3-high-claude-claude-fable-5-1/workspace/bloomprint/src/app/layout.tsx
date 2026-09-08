import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Bloomprint · A one-of-one botanical specimen, grown from your name",
  description:
    "Enter a name and a date. We grow a unique plant that has never existed before, draw it as a vintage herbarium plate, and print it direct-to-garment on a soft cotton tee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen paper-grain">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            Bloomprint
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/#how" className="hidden text-ink-soft hover:text-ink sm:inline">
              How it works
            </Link>
            <Link href="/design" className="btn-primary !py-2 !px-4">
              Grow yours
            </Link>
          </nav>
        </header>
        {children}
        <footer className="mx-auto mt-24 max-w-6xl border-t border-ink/10 px-5 py-8 text-xs text-ink-soft">
          <p>
            Bloomprint · Every specimen is generated once for one person, printed direct-to-garment on a Bella+Canvas 3001 tee and shipped worldwide.
          </p>
        </footer>
      </body>
    </html>
  );
}
