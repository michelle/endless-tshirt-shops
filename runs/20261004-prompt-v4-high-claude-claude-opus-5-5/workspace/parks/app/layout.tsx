import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({ src: "../fonts/AlfaSlabOne-Regular.ttf", variable: "--font-display" });
const label = localFont({ src: "../fonts/Anton-Regular.ttf", variable: "--font-label" });

export const metadata: Metadata = {
  title: "Personal Parks Service — your own national park, on a tee",
  description:
    "Name a national park after anyone (or anything). We survey a one-of-a-kind landscape from the name and print it on a soft Bella+Canvas tee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${label.variable}`}>
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              ▲
            </span>
            Personal Parks Service
          </a>
          <span className="header-note">Every person deserves a national park.</span>
        </header>
        {children}
        <footer className="site-footer">
          <p>
            Personal Parks Service is not affiliated with the U.S. National Park Service — we just think your backyard
            deserves the same respect.
          </p>
          <p>Printed to order with DTG on Bella+Canvas 3001 · Fulfilled by Prodigi · Payments by Stripe</p>
        </footer>
      </body>
    </html>
  );
}
