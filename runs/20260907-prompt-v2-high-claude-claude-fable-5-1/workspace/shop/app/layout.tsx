import type { Metadata } from "next";
import { Alfa_Slab_One, Special_Elite, Libre_Franklin } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const display = Alfa_Slab_One({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const typewriter = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-typewriter" });
const body = Libre_Franklin({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "The Obsolete Guild — Union tees for extinct trades",
  description:
    "Union-badge t-shirts honouring the lamplighters, knocker-uppers, human computers and other trades the world forgot. Printed to order, shipped worldwide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${typewriter.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
