import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cryptidæ — a field guide to the creature that is definitely you",
  description:
    "Answer five questions and we draw the cryptid you have been harbouring: a one-of-one naturalist's plate, direct-to-garment printed on a Bella+Canvas 3001. Nobody else gets your creature.",
  openGraph: {
    title: "Cryptidæ — your personal cryptid, printed once",
    description:
      "Five questions. One creature. One shirt. Direct-to-garment printed and shipped worldwide.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="masthead">
          <div className="wrap bar">
            <a className="wordmark" href="/">
              CRYPTID<span>Æ</span>
            </a>
            <nav className="nav">
              <a href="/#how">How it works</a>
              <a href="/#specimens">Specimens</a>
              <a href="/#faq">FAQ</a>
              <a className="btn" href="/#summon">
                Summon yours
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer>
          <div className="wrap footrow">
            <span>Cryptidæ — Field Guides to the Unseen</span>
            <span>Printed on demand · Bella + Canvas 3001 · Ships to 108 countries</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
