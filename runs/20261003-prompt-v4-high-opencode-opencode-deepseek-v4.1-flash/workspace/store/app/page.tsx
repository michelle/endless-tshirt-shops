import Configurator from '@/components/Configurator';

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <div className="logo">
            RE<span>SONA</span>
          </div>
          <nav className="nav">
            <a href="#create">Create yours</a>
            <a href="#idea">The idea</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="badge">One of one</div>
        </div>
      </header>

      <main>
        <section className="hero wrap">
          <div className="eyebrow">Generative apparel · Printed on demand</div>
          <h1>
            Wear your name <em>in light</em>.
          </h1>
          <p>
            Every RESONA tee is a one-of-one artwork generated from your name. Choose a palette and a style, and
            we turn the letters into a topographic aura — then print it with direct-to-garment technology and ship
            it straight to your door. No two shirts are ever alike.
          </p>
        </section>

        <div className="wrap">
          <Configurator />
        </div>

        <section className="block" id="idea">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Why RESONA</div>
              <h2>Made for a technology that prints one shirt at a time</h2>
              <p>
                Direct-to-garment printing has no colour limits and no minimum order — so we can give every customer
                something that has genuinely never existed before.
              </p>
            </div>
            <div className="cards">
              <div className="card">
                <div className="k">✦</div>
                <h3>Original generative art</h3>
                <p>
                  Your name is the seed. A deterministic engine draws the contours, orbits and colour field, so the
                  artwork is mathematically yours — and always identical when we print it.
                </p>
              </div>
              <div className="card">
                <div className="k">◐</div>
                <h3>Full-colour DTG</h3>
                <p>
                  Gradients, fine lines and hundreds of tones are printed directly into the fabric. That is only
                  possible because each garment is printed individually, not screen-printed in batches.
                </p>
              </div>
              <div className="card">
                <div className="k">1/1</div>
                <h3>One of one</h3>
                <p>
                  Change a single letter and the whole composition changes. Your shirt is stamped 1 of 1 and produced
                  only after you order it — no warehouse, no waste.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="block" id="how">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">How it works</div>
              <h2>From your name to your doorstep</h2>
            </div>
            <div className="steps">
              <div className="step">
                <div className="n">STEP 01</div>
                <h3>Create</h3>
                <p>Type a name, pick a palette and style. The live preview updates as you go.</p>
              </div>
              <div className="step">
                <div className="n">STEP 02</div>
                <h3>Pay securely</h3>
                <p>Checkout is handled by Stripe. We only send the order to print once payment succeeds.</p>
              </div>
              <div className="step">
                <div className="n">STEP 03</div>
                <h3>We print</h3>
                <p>Prodigi prints your one-of-one artwork with direct-to-garment technology.</p>
              </div>
              <div className="step">
                <div className="n">STEP 04</div>
                <h3>It ships</h3>
                <p>Your shirt is printed, packed and shipped worldwide — usually within a few days.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="block">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">The garment</div>
              <h2>Bella + Canvas 3001</h2>
              <p>
                A tailored-fit, unisex crew neck in 100% Airlume combed and ring-spun cotton. Soft, substantial and
                printed with water-based inks for a finish that lasts.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div>
            <div className="logo" style={{ fontSize: 18, marginBottom: 8 }}>
              RE<span>SONA</span>
            </div>
            <div>One-of-one generative tees.</div>
          </div>
          <div>
            <div>Payments by Stripe · Fulfilment by Prodigi</div>
            <div style={{ marginTop: 6 }}>© {new Date().getFullYear()} RESONA. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </>
  );
}
