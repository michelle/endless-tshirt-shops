import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEED — the one-of-one tee company',
  description:
    'Give us one word. Our algorithm grows it into artwork that has never existed before — printed once, on your shirt, never repeated.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            SEED<span className="brand-dot">.</span>
          </a>
          <nav>
            <a href="/#how">How it works</a>
            <a href="/#shirt">The shirt</a>
            <a href="/create" className="nav-cta">
              Grow yours
            </a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <span>SEED — every shirt printed once, never repeated.</span>
          <span className="footer-dim">
            Printed on demand · Bella + Canvas 3001 · ships worldwide
          </span>
        </footer>
      </body>
    </html>
  );
}
