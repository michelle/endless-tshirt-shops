import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4000 Fridays — your whole life on a shirt",
  description:
    "One dot for every week you've been alive. Custom life-calendar t-shirts, generated to order and printed with direct-to-garment ink. Your name, your birth date, your life — no two shirts alike.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The exact fonts the print file uses, so the preview matches the print. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-header">
          <a className="wordmark" href="/">
            4000<span className="wordmark-accent"> Fridays</span>
          </a>
          <nav className="site-nav">
            <a href="#make">Make yours</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div>
            <strong>4000 FRIDAYS</strong> — your whole life, one dot per week.
          </div>
          <div>
            Printed to order with water-based DTG inks · Bella+Canvas 3001 ·
            Ships worldwide
          </div>
        </footer>
      </body>
    </html>
  );
}
