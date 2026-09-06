import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { mono, sans } from "./fonts";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Status Tees — HTTP status code t-shirts", template: "%s — Status Tees" },
  description: "T-shirts for people who think in HTTP. Pick a status code, pick a shirt, printed on demand and shipped worldwide.",
  openGraph: { title: "Status Tees", description: "T-shirts for people who think in HTTP.", images: ["/mockup/418-big-black.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
            <Link href="/" className="font-mono font-extrabold tracking-tight text-lg">
              <span className="text-accent">200</span> status.tees
            </Link>
            <nav className="font-mono text-sm text-muted flex gap-5">
              <Link href="/#codes" className="hover:text-paper">all codes</Link>
              <Link href="/tee/418" className="hover:text-paper">418</Link>
              <Link href="/#faq" className="hover:text-paper">faq</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 mt-20">
          <div className="mx-auto max-w-6xl px-5 py-8 font-mono text-xs text-muted flex flex-col gap-2 sm:flex-row sm:justify-between">
            <span>Printed on demand by Prodigi. Payments by Stripe. Test mode.</span>
            <span>HTTP/1.1 200 OK · Server: status.tees</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
