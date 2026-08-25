import type { Metadata } from "next";
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
  title: "datetime.store — a t-shirt with this exact moment on it",
  description:
    "We sell a t-shirt with the current datetime. The moment you click buy, we freeze it, print it, and ship it — it never existed before and never will again.",
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-neutral-100">
        {children}
      </body>
    </html>
  );
}
