import Customizer from "@/components/Customizer";

export default function Home() {
  return (
    <>
      <div className="container">
        <header className="site-header">
          <div className="brand">
            Under <span>This</span> Sky
          </div>
          <div className="header-tag">Custom star map tees</div>
        </header>

        <section className="hero">
          <h1>
            The sky from <em>your</em> moment,
            <br />
            on a shirt made only for you.
          </h1>
          <p>
            A first date. A birth. The night everything changed. Tell us when and where, and we chart the
            real stars overhead at that exact moment — then print your one-of-a-kind sky on a premium
            cotton tee, on demand. No two shirts are alike.
          </p>
          <a className="cta" href="#customize">
            Create your sky
          </a>
        </section>

        <section className="how">
          <div className="how-card">
            <div className="num">1</div>
            <h3>Pick your moment</h3>
            <p>Date, time and place — an anniversary, a birthplace, anywhere on Earth, any night since 1900.</p>
          </div>
          <div className="how-card">
            <div className="num">2</div>
            <h3>We chart the sky</h3>
            <p>
              Our star engine plots over 2,000 real stars and all 88 constellations exactly as they stood
              above you, using genuine astronomical math.
            </p>
          </div>
          <div className="how-card">
            <div className="num">3</div>
            <h3>Printed just for you</h3>
            <p>
              Your design is direct-to-garment printed on a Gildan 5000 heavy-cotton tee and shipped
              straight to your door.
            </p>
          </div>
        </section>
      </div>

      <section className="customizer" id="customize">
        <div className="container">
          <h2>Design yours</h2>
          <p className="sub">Watch your sky appear as you type.</p>
          <Customizer />
        </div>
      </section>

      <footer className="footer container">
        <div>Under This Sky — every shirt is printed on demand, one sky at a time.</div>
        <div className="fine">
          Star data: Yale Bright Star Catalog. Printed &amp; fulfilled by Prodigi. Secure payments by Stripe.
        </div>
      </footer>
    </>
  );
}
