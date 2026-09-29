import './globals.css';

export const metadata = {
  title: 'Celestee — Wear the sky from your moment',
  description:
    'A museum-quality star map of the exact night sky above your most important moment, printed on a premium tee. Every shirt is one of one.',
  openGraph: {
    title: 'Celestee — Wear the sky from your moment',
    description: 'Your date. Your place. Your exact sky — charted and printed on a premium tee.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <a className="brand" href="/">
              Celestee<span className="star">✦</span>
            </a>
            <nav className="nav">
              <a href="/#how">How it works</a>
              <a href="/#gallery">Nights to remember</a>
              <a href="/#details">Details</a>
              <a className="cta-small" href="/create">Create yours — $34</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <span>© {new Date().getFullYear()} Celestee. Every shirt is one of one.</span>
            <span>Printed on demand · Bella + Canvas 3001 · Ships worldwide</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
