import type { Metadata } from "next";
import { Chivo, Chivo_Mono } from "next/font/google";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "The Datetime Store",
  description:
    "A t-shirt printed with the exact date and time you bought it. This exact moment, frozen forever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${chivo.variable} ${chivoMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#101014] text-[#f5f5f7] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
