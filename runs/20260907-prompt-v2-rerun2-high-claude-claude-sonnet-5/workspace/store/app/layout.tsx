import type { Metadata } from "next";
import { Oswald, Special_Elite } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const specialElite = Special_Elite({
  variable: "--font-type",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "The Bureau of Ordinary Monsters — Cryptid Employee Tees",
  description:
    "Retro employee-badge t-shirts for cryptids with terrible jobs. Bigfoot, Nessie, Mothman and more, printed to order.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${oswald.variable} ${specialElite.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-paper text-ink antialiased">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
