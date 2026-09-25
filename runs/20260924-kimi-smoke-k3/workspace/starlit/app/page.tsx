import Configurator from "./configurator";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <div className="brand">
          Star<span>lit</span>
        </div>
        <nav>
          <a href="#design">Design yours</a>
        </nav>
      </header>

      <section className="hero">
        <h1>
          The sky that <em>made</em> you.
        </h1>
        <p>
          The exact arrangement of stars over the place and moment that changed
          everything — computed from a real star catalog and printed on demand,
          just for you, on a premium Bella+Canvas tee.
        </p>
        <a className="hero-cta" href="#design">
          Design your shirt
        </a>
      </section>

      <Configurator />

      <section className="how">
        <div className="how-card">
          <div className="n">01</div>
          <h3>Pick your moment</h3>
          <p>
            A first kiss, a birth, the night everything changed. Choose the
            place, date and time — we compute the sky exactly as it was.
          </p>
        </div>
        <div className="how-card">
          <div className="n">02</div>
          <h3>We chart the sky</h3>
          <p>
            Over a thousand real stars and every constellation line, projected
            for your coordinates and rendered as print-ready artwork.
          </p>
        </div>
        <div className="how-card">
          <div className="n">03</div>
          <h3>Printed just for you</h3>
          <p>
            Direct-to-garment printed on a Bella+Canvas 3001 and shipped
            tracked to your door by our print partner, Prodigi.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div>STARLIT — every shirt a sky of its own</div>
        <div>Printed on demand · No two shirts alike</div>
      </footer>
    </main>
  );
}
