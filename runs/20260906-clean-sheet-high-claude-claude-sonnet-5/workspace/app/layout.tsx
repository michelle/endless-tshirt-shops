import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "STATUS/CODE — HTTP Status Code Tees",
  description:
    "Wear the response. Shirts for every HTTP status code that's ever ruined — or made — your day. 404, 418, 500, and more, printed on-demand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0c] text-neutral-100">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
            <Link href="/" className="font-mono font-bold tracking-tight text-lg">
              STATUS<span className="text-emerald-400">/</span>CODE
            </Link>
            <nav className="flex items-center gap-6 font-mono text-sm text-neutral-400">
              <Link href="/#shop" className="hover:text-neutral-100 transition-colors">
                Shop
              </Link>
              <span className="hidden sm:inline text-neutral-600">|</span>
              <span className="hidden sm:inline">Stripe test mode</span>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-8 font-mono text-xs text-neutral-500 space-y-1">
            <p>
              STATUS/CODE is a demo store. Payments run on{" "}
              <strong className="text-neutral-400">Stripe test mode</strong> — use a{" "}
              test card, no real money moves. Orders are fulfilled on-demand by{" "}
              <strong className="text-neutral-400">Prodigi</strong> (sandbox environment).
            </p>
            <p>© {new Date().getFullYear()} STATUS/CODE. HTTP/1.1 200 OK.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
