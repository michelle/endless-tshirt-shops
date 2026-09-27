import Customizer from "./customizer";

export default function Home() {
  return (
    <div className="wrap">
      <header className="site">
        <a className="logo" href="/">
          STARMARK
        </a>
        <span className="tagline">Wear your moment</span>
      </header>

      <section className="hero">
        <h1>
          The night sky of <em>your</em> moment,
          <br />
          printed on a shirt.
        </h1>
        <p>
          An anniversary. A first kiss. The minute your child was born. Tell us
          the date, time and place — we chart the exact sky overhead using real
          sidereal astronomy, add the moon phase, and print your one-of-a-kind
          star map on a premium Bella+Canvas tee. No two shirts on Earth are
          alike.
        </p>
      </section>

      <Customizer />

      <section className="features">
        <div className="feature">
          <h3>Astronomically yours</h3>
          <p>
            Your sky is computed from genuine local sidereal time for your
            coordinates and moment, then drawn as a museum-style star chart —
            complete with the moon phase of that night.
          </p>
        </div>
        <div className="feature">
          <h3>Printed on demand</h3>
          <p>
            Each shirt is direct-to-garment printed at 300 DPI on a Bella+Canvas
            3001 — 100% cotton, unisex, sizes XS–4XL — only after you order.
          </p>
        </div>
        <div className="feature">
          <h3>A gift that can't be re-gifted</h3>
          <p>
            Weddings, births, the night you said yes. A StarMark shirt is made
            for exactly one person and exactly one moment.
          </p>
        </div>
      </section>

      <footer className="site">
        <span>© {new Date().getFullYear()} StarMark Studio</span>
        <span>Printed &amp; shipped worldwide by Prodigi</span>
      </footer>
    </div>
  );
}
