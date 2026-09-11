import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Constellate — Wear Your Story in the Stars",
  description:
    "Custom DTG t-shirts printed with a one-of-a-kind constellation generated from your names and your date.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#05060c] text-[#f2f4fb]">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
            <Link href="/" className="font-serif text-lg tracking-[0.2em] uppercase">
              Constellate
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/#how-it-works" className="text-white/70 hover:text-white transition">
                How it works
              </Link>
              <Link
                href="/design"
                className="rounded-full bg-white text-black px-4 py-2 font-medium hover:bg-white/85 transition"
              >
                Design yours
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 text-white/50 text-xs">
          <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col gap-2">
            <p>
              Constellate · Made-to-order via direct-to-garment printing. Every shirt is produced only after
              payment succeeds, then printed and shipped by our production partner.
            </p>
            <p>© {new Date().getFullYear()} Constellate. This is a demo storefront running in sandbox/test mode.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
