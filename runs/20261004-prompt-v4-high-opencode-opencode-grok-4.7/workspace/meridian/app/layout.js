import "./globals.css";

export const metadata = {
  title: "Meridian — the sky, the night it mattered",
  description:
    "A custom star-map t-shirt of the sky above a place and an hour you choose. Printed once, on a Bella+Canvas 3001, and shipped to you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@360;460;560&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="banner">
          Stripe test mode. Card <code>4242 4242 4242 4242</code>, any future date, any CVC.
          Orders go to the Prodigi sandbox and are not printed or shipped.
        </div>
        <header className="nav">
          <a className="wordmark" href="/">Meridian</a>
          <nav>
            <a href="/#garment">The shirt</a>
            <a className="nav-cta" href="/create">Make one</a>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <strong>Meridian</strong>
            <p>Custom star charts, printed direct-to-garment. One sky, one shirt.</p>
          </div>
          <p className="fine">
            Bella+Canvas 3001. Water-based DTG inks. Wash cold, inside out. This store runs on Stripe test mode and the Prodigi sandbox.
          </p>
        </footer>
      </body>
    </html>
  );
}
