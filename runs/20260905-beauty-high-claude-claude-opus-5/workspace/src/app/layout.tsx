import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://datetime.store"),
  title: "datetime.store — we sell a t-shirt with the current datetime",
  description:
    "One product: a t-shirt printed with the exact millisecond you decided to buy it. Five ways of writing it down. Never made twice.",
  openGraph: {
    title: "datetime.store",
    description: "A t-shirt with the exact millisecond you decided to buy it.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "datetime.store" },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#16130f"/><circle cx="16" cy="17" r="9" fill="none" stroke="#f7f3ea" stroke-width="2"/><path d="M16 12v5.4l3.4 2" stroke="#ff4d2e" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M12.5 6h7" stroke="#f7f3ea" stroke-width="2.4" stroke-linecap="round"/></svg>`,
          ),
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} ${spaceMono.variable}`}>
      <body className="grain antialiased">{children}</body>
    </html>
  );
}
