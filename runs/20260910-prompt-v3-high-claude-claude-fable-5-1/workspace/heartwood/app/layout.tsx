import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heartwood — your years, drawn as rings",
  description:
    "A tree records every year it lives as a ring. So do you. Heartwood turns your birthday and the moments that shaped you into a one-of-a-kind ring pattern, printed on a shirt, once, just for you.",
};

function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#3f2a17" />
      <circle cx="16" cy="16" r="12" fill="#e5c497" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#82502a" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="#82502a" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="3.8" fill="none" stroke="#c2431e" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="1.4" fill="#3f2a17" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="wrap">
          <header className="site-header">
            <Link href="/" className="brand">
              <Mark /> Heartwood
            </Link>
            <nav className="nav">
              <Link href="/#how">How it works</Link>
              <Link href="/#faq">FAQ</Link>
              <Link href="/design" className="btn">
                Grow yours
              </Link>
            </nav>
          </header>
        </div>
        {children}
        <div className="wrap">
          <footer className="site-footer">
            <span>© {new Date().getFullYear()} Heartwood. Every shirt generated once, printed once.</span>
            <span>Printed with DTG on Gildan Softstyle cotton · Ships worldwide via Prodigi</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
