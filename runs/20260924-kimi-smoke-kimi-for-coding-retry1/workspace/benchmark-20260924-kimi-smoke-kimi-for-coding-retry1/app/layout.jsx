import './globals.css';

export const metadata = {
  title: 'SKYWRITER — Wear the night your sky changed',
  description:
    'Custom star-map t-shirts printed with DTG. Enter any date, time and place — we chart the actual night sky from that moment and print it on a Bella+Canvas 3001, just for you.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="site">
          <header className="nav">
            <a className="brand" href="/">
              SKY<span>WRITER</span>
            </a>
            <nav>
              <a href="/#customize">Customize</a>
              <a href="/checkout" className="cartlink">
                Cart <em id="cart-count" className="cartcount">0</em>
              </a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="footer">
            <p>
              SKYWRITER — your sky, printed. Every shirt is individually charted and
              direct-to-garment printed on demand, then shipped by Prodigi’s global print network.
            </p>
            <p className="fineprint">Stars &amp; constellation data: Yale Bright Star Catalogue via d3-celestial (BSD-3). Moon &amp; sun positions computed in-app.</p>
          </footer>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `function __swCart(){try{return JSON.parse(localStorage.getItem('skywriter_cart')||'[]')}catch(e){return[]}}
function __swCartCount(){document.getElementById('cart-count').textContent=__swCart().reduce(function(n,i){return n+i.design.qty},0)}
__swCartCount();window.addEventListener('storage',__swCartCount);window.__swRefreshCart=__swCartCount;`,
          }}
        />
      </body>
    </html>
  );
}
