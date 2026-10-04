import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stillpoint — the sky from the hour you kept",
  description: "A custom t-shirt printed with the stars above a place, on a night that mattered. Charted for you, printed direct to garment after you pay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="banner">
          Test store. Pay with <strong>4242 4242 4242 4242</strong>, any future date, any CVC. No real charge, and the shirt is not actually printed.
        </div>
        <div className="shell">
          <header className="nav">
            <a className="brand" href="/"><i /> Stillpoint</a>
            <div className="nav-note">A shirt of one hour</div>
          </header>
          {children}
          <footer>
            <span>Gildan Softstyle 64000 · printed direct to garment by Prodigi</span>
            <span>Payment by Stripe · print only after the charge succeeds</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
