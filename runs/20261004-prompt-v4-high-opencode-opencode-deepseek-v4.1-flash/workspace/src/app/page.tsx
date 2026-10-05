import Customizer from "@/components/Customizer";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <a className="wordmark" href="#top">
            ASTER<span>.</span>
          </a>
          <nav className="site-nav">
            <a href="#create">Create yours</a>
            <a href="#how">How it works</a>
            <a href="#details">Details</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero container">
          <p className="eyebrow">Made to order · Direct to garment</p>
          <h1>
            The sky above <em>your</em> moment, printed on cotton.
          </h1>
          <p>
            Aster turns a date, a time and a place into the exact night sky that hung over it —
            every star in its true position, down to the minute. We print it on demand and ship it
            to your door. No two charts are ever the same.
          </p>
        </section>

        <section className="builder container" id="create">
          <Customizer />
        </section>

        <section className="section" id="how">
          <div className="container">
            <h2>One shirt. One sky. One of one.</h2>
            <p className="lede">
              Direct-to-garment printing lets us lay down a full-colour chart in a single pass, so a
              personalised design costs the same as a stock one. Nothing is printed until you order.
            </p>
            <div className="steps">
              <div className="step">
                <div className="n">01</div>
                <h3>Choose the moment</h3>
                <p>A birth, a wedding, a first night in a new city. Enter the date, time and place — we resolve the coordinates and time zone for you.</p>
              </div>
              <div className="step">
                <div className="n">02</div>
                <h3>We compute the sky</h3>
                <p>Thousands of catalogued stars and the major constellations are projected for that exact instant, with the moon phase as it was that night.</p>
              </div>
              <div className="step">
                <div className="n">03</div>
                <h3>Printed and shipped</h3>
                <p>Your chart is rendered at print resolution and sent to our production partner only after payment clears, then shipped tracked to your door.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="details">
          <div className="container">
            <h2>Details that matter</h2>
            <p className="lede">
              We print on the Gildan Softstyle 64000 — a midweight, 100% ring-spun cotton unisex tee
              that takes fine line work and large solid areas cleanly.
            </p>
            <div className="steps">
              <div className="step">
                <div className="n">Fit</div>
                <h3>Softstyle 64000</h3>
                <p>Unisex sizing XS–5XL, taped neck, double-needle hems. A soft, slightly fitted everyday tee.</p>
              </div>
              <div className="step">
                <div className="n">Ink</div>
                <h3>Four palettes</h3>
                <p>Warm cream and gold for dark shirts; deep navy and ember for light ones. Printed with a soft-hand water-based DTG finish.</p>
              </div>
              <div className="step">
                <div className="n">Print</div>
                <h3>Large front chart</h3>
                <p>A roughly 12-inch square chart, centred on the chest, with your title, coordinates, date and time.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container">
            <h2>Questions</h2>
            <div className="faq">
              <details>
                <summary>Is the sky accurate?</summary>
                <p>
                  Yes. We project a catalogue of naked-eye stars and the classical constellation lines
                  for the exact instant and coordinates you choose, using local sidereal time. It is
                  accurate enough to recognise the constellations you actually saw.
                </p>
              </details>
              <details>
                <summary>What if I don&apos;t know the exact time?</summary>
                <p>
                  Choose your best guess. The sky moves roughly one degree every four minutes, so a
                  nearby time still produces a faithful chart. If you only know the date, try 21:00.
                </p>
              </details>
              <details>
                <summary>How long does delivery take?</summary>
                <p>
                  Printing takes 2–4 business days, then shipping. Standard shipping is estimated at
                  5–12 business days depending on destination.
                </p>
              </details>
              <details>
                <summary>Returns and reprints</summary>
                <p>
                  Because every item is made for one person, we cannot accept change-of-mind returns.
                  If a shirt arrives damaged or misprinted, contact us and we will reprint it at no cost.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <span>© {new Date().getFullYear()} Aster. Custom night sky apparel.</span>
          <span>
            Payment by Stripe · Fulfilment by Prodigi · <a href="#create">Create yours</a>
          </span>
        </div>
      </footer>
    </>
  );
}
