import Customizer from '@/components/Customizer';

export default function Home() {
  return (
    <main>
      <div className="container">
        <nav className="nav">
          <span className="wordmark">MANTRA</span>
          <span className="tag">Wear your word</span>
        </nav>
      </div>

      <header className="hero container">
        <h1>
          One word.
          <br />
          One shirt.
          <br />
          <em>Yours alone.</em>
        </h1>
        <p>
          Type a word and we compose a typographic print that exists exactly once — yours.
          Printed to order on a Bella+Canvas 3001 with soft, water-based DTG inks.
        </p>
        <a className="scroll-cue" href="#make">
          Make yours
        </a>
      </header>

      <section className="how">
        <div className="container">
          <p className="section-title">How it works</p>
          <h2 className="section-heading">Three steps. Zero repeats.</h2>
          <div className="how-grid">
            <div className="how-card">
              <span className="num">01</span>
              <h3>Type your word</h3>
              <p>
                Up to fourteen characters. A name, a place, a promise — whatever you want to
                carry on your chest.
              </p>
            </div>
            <div className="how-card">
              <span className="num">02</span>
              <h3>Pick your style</h3>
              <p>
                Four typographic treatments, six shirt colors, eight inks. The preview you see
                is the exact layout we print.
              </p>
            </div>
            <div className="how-card">
              <span className="num">03</span>
              <h3>We print &amp; ship</h3>
              <p>
                Your design is rendered as a one-off print file, DTG-printed on demand and
                shipped worldwide in about 5–8 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="customizer" id="make">
        <div className="container">
          <p className="section-title">The One-of-One Tee — $29</p>
          <h2 className="section-heading">Make yours</h2>
          <Customizer />
        </div>
      </section>

      <section className="faq">
        <div className="container">
          <p className="section-title">FAQ</p>
          <h2 className="section-heading">Good questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>How does it print?</h3>
              <p>
                Direct-to-garment with water-based inks on the Bella+Canvas 3001 — a soft,
                retail-fit 100% cotton tee. The print soaks into the fabric, so it flexes and
                washes like the shirt itself.
              </p>
            </div>
            <div className="faq-item">
              <h3>When does it arrive?</h3>
              <p>
                Every shirt is printed to order and shipped worldwide. Standard delivery lands
                in roughly 5–8 business days depending on where you are.
              </p>
            </div>
            <div className="faq-item">
              <h3>Is every shirt really unique?</h3>
              <p>
                Yes. Your print file is generated from your word the moment you order, used
                once, and never reused. Nº 1 of 1, always.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="container footer">
        <span>MANTRA</span>
        <span>Nº 1 of 1 — always</span>
      </footer>
    </main>
  );
}
