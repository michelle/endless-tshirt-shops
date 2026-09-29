import "./globals.css";

export const metadata = {
  title: "ONE OF ONE STUDIO — a shirt only you will ever own",
  description:
    "Type a word that means something to you. We grow it into a unique generative artwork and print it on exactly one shirt on Earth. Direct-to-garment, Bella+Canvas 3001.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <header className="site">
            <a className="logo" href="/">
              ONE<em>/</em>OF<em>/</em>ONE <span style={{ color: "var(--ink-faint)" }}>STUDIO</span>
            </a>
            <nav className="site">
              <a href="/#how">How it works</a>
              <a href="/#shirt">The shirt</a>
              <a href="/create">Create yours</a>
            </nav>
          </header>
        </div>
        {children}
        <div className="wrap">
          <footer className="site">
            <span>ONE/OF/ONE STUDIO — every piece is an edition of one.</span>
            <span>Printed on demand · Bella+Canvas 3001 · Ships worldwide</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
