import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "datetime.store — a t-shirt with the current datetime on it",
  description:
    "We sell exactly one product: a t-shirt printed with the precise millisecond you bought it. That's it. That's the store.",
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime on it.",
    images: ["/api/artwork/now.png?fg=%23f5f3ee&bg=%230a0a0a"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
