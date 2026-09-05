import type { Metadata } from "next";
import { Chivo, Inter } from "next/font/google";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "datetime.store — a t-shirt with this exact moment",
  description:
    "We sell one t-shirt: printed with the precise millisecond you buy it. Pick a fit and size, and datetime.store prints and ships it via Prodigi.",
  openGraph: {
    title: "datetime.store",
    description:
      "A t-shirt printed with the exact moment you buy it — down to the millisecond.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${chivo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#08090b] text-neutral-100">
        {children}
      </body>
    </html>
  );
}
