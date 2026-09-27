import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/design";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} - the custom dictionary-definition tee`,
  description:
    "Every person deserves a dictionary entry. Type a name, get a fully custom DTG-printed t-shirt shipped worldwide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f4f1ea] text-[#1d1a15]">
        <header className="border-b border-[#1d1a15]/15">
          <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
            <Link href="/" className="font-serif text-2xl tracking-tight">
              {BRAND_NAME}
            </Link>
            <nav className="text-sm text-[#1d1a15]/70">
              <Link href="/" className="hover:text-[#1d1a15]">
                Design yours
              </Link>
              <span className="mx-2 text-[#1d1a15]/30">|</span>
              <Link href="/track" className="hover:text-[#1d1a15]">
                Track an order
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[#1d1a15]/15 mt-16">
          <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-[#1d1a15]/60 flex flex-wrap gap-x-6 gap-y-2">
            <span>
              Printed on demand with DTG and shipped worldwide by Prodigi.
            </span>
            <span>Sandbox / test-mode demo store - no real charges.</span>
            <span>{BRAND_NAME} - every person, defined.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
