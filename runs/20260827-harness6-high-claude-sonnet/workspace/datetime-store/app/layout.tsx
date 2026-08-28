import type { Metadata } from "next";
import { Chivo, Space_Mono } from "next/font/google";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "datetime.store — a t-shirt with the current datetime",
  description:
    "We sell one t-shirt: printed with the exact millisecond timestamp at the moment you buy it. One-of-one, forever.",
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
      className={`${chivo.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fafaf8] text-[#141414]">
        {children}
      </body>
    </html>
  );
}
