import type { Metadata } from "next";
import { Geist, Chivo } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "datetime.store — a t-shirt with the current datetime",
  description:
    "We sell a t-shirt printed with the exact millisecond you bought it. Pick a fit, hit buy, and we'll print the moment forever.",
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${chivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
