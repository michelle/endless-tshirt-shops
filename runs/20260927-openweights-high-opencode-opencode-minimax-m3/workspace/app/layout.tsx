import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GNOMON — A sundial for your moment",
  description:
    "Wear the sky at the moment that mattered. A custom-engraved sundial printed on a heavyweight cotton tee, made just for you via direct-to-garment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-banner">
          <div className="brand">
            <span className="brand-mark">◐</span>
            <span className="brand-name">GNOMON</span>
            <span className="brand-tag">a sundial for your moment</span>
          </div>
          <nav>
            <a href="/order">Track an order</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <span>DTG-printed on demand · Ships from the closest of 30+ global labs</span>
          <span>Bella+Canvas 3001, 100% combed ringspun cotton · 4.2 oz</span>
        </footer>
      </body>
    </html>
  );
}
