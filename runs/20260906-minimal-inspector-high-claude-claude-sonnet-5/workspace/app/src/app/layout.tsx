import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "datetime.store — a t-shirt with the current datetime",
  description:
    "We sell a t-shirt with the current datetime. Pick a fit and size, and we print the exact millisecond you check out.",
  metadataBase: new URL("https://datetime.store"),
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 font-sans text-zinc-100">
        {children}
        <footer className="border-t border-zinc-900 px-6 py-8 text-center text-xs text-zinc-600">
          datetime.store — payments by Stripe, printing &amp; shipping by
          Prodigi.
        </footer>
      </body>
    </html>
  );
}
