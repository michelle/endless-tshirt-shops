import SeedCanvas from '@/components/SeedCanvas';
import { PALETTES } from '@/lib/catalogue';

const SAMPLES = [
  { word: 'aurora', palette: PALETTES[1], bg: '#181818', dark: true },
  { word: 'home', palette: PALETTES[0], bg: '#212a3f', dark: true },
  { word: 'frida', palette: PALETTES[4], bg: '#181818', dark: true },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="kicker">One word in — one shirt out</p>
          <h1>
            A shirt that has <em>never existed</em> before. Yours.
          </h1>
          <p className="lede">
            Type a word that means something to you — a name, a place, a date
            that changed everything. Our algorithm grows it into a piece of
            generative artwork, printed once on a premium tee and never grown
            again. DTG printing means no minimums, no repeats: a run of one.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="/create">
              Grow your shirt — $39
            </a>
            <span className="hero-note">free standard shipping worldwide</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          {SAMPLES.map((s) => (
            <figure key={s.word} style={{ background: s.bg }}>
              <SeedCanvas
                word={s.word}
                palette={s.palette}
                darkGarment={s.dark}
                width={640}
                height={800}
                caption={false}
              />
              <figcaption>{s.word}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section" id="how">
        <h2>How it works</h2>
        <p className="section-sub">
          Every design is computed from your word — the letters become the seed
          of a flow-field algorithm. Change one letter and the whole artwork
          changes. Nobody else will ever wear yours.
        </p>
        <div className="steps">
          <div className="step">
            <span className="step-num">01</span>
            <h3>Plant a word</h3>
            <p>
              Your word seeds the random number generator that drives every
              curve, color choice and grain of the artwork. Same word, same
              art — cryptographically yours.
            </p>
          </div>
          <div className="step">
            <span className="step-num">02</span>
            <h3>Watch it grow</h3>
            <p>
              Thousands of threads follow a flow field unique to your seed,
              curling around a centre of gravity the algorithm picks for you.
              You see the exact print file before you buy.
            </p>
          </div>
          <div className="step">
            <span className="step-num">03</span>
            <h3>Printed once</h3>
            <p>
              After payment confirms, your file goes straight to a DTG print
              lab — rendered at 4,677 × 5,881 px, printed on demand, and
              shipped to your door. A true run of one.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="shirt">
        <h2>The shirt</h2>
        <p className="section-sub">
          We print on the Bella + Canvas 3001 — the blank the premium merch
          world runs on.
        </p>
        <dl className="spec-grid">
          <div className="spec">
            <dt>Fabric</dt>
            <dd>100% airlume combed, ring-spun cotton. Soft, not scratchy.</dd>
          </div>
          <div className="spec">
            <dt>Fit</dt>
            <dd>Unisex retail fit, crew neck, side-seamed. XS – 3XL.</dd>
          </div>
          <div className="spec">
            <dt>Print</dt>
            <dd>Direct-to-garment, water-based inks. No plasticky feel.</dd>
          </div>
          <div className="spec">
            <dt>Colors</dt>
            <dd>Black, white, navy, asphalt or cream — pick what flatters your art.</dd>
          </div>
          <div className="spec">
            <dt>Shipping</dt>
            <dd>Standard worldwide shipping included in the $39.</dd>
          </div>
          <div className="spec">
            <dt>Guarantee</dt>
            <dd>Print defect or wrong size? We reprint or refund, no debate.</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
