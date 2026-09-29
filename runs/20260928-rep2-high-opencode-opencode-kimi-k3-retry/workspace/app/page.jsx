import { readFileSync } from "fs";
import { join } from "path";

export default function Home() {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "public/samples/manifest.json"), "utf8")
  );
  const gallery = manifest.slice(0, 8);

  return (
    <main>
      <div className="wrap">
        <section className="hero">
          <div className="eyebrow">Generative apparel · Edition of one</div>
          <h1>
            Type a word.
            <br />
            <span className="thin">Wear what it grows into.</span>
          </h1>
          <p className="sub">
            Every shirt begins with a word that means something to you — a name, a place, a
            promise. Our engine grows it into a flowing artwork that has never existed before,
            then prints it on exactly one shirt on Earth. Yours.
          </p>
          <div className="cta-row">
            <a className="btn" href="/create">
              Create yours — $36
            </a>
            <a className="btn ghost" href="#how">
              How it works
            </a>
          </div>
        </section>
      </div>

      <div className="wrap gallery">
        <div className="gallery-grid">
          {gallery.map((g) => (
            <figure className="gallery-item" key={g.file}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.file} alt={`Generative artwork grown from “${g.word}”`} loading="lazy" />
              <figcaption className="cap">
                <b>“{g.word}”</b>
                <span>№ {g.edition}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="home-gallery-note">
        Each piece above was grown from a single word. Nobody else can ever own the same one.
      </p>

      <section className="block" id="how">
        <div className="wrap">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="n">01 — SEED</div>
              <h3>Give us your word</h3>
              <p>
                A name, a date, the place you met, the word your grandmother always said. It becomes
                the seed — the DNA — of your artwork. Same word, same art, forever.
              </p>
            </div>
            <div className="step">
              <div className="n">02 — GROW</div>
              <h3>Watch it grow</h3>
              <p>
                Thousands of flowing strokes follow a field unique to your word. Pick a palette and
                a shirt, and preview the exact piece live before you buy.
              </p>
            </div>
            <div className="step">
              <div className="n">03 — WEAR</div>
              <h3>One print, ever</h3>
              <p>
                We print it once — direct-to-garment on a Bella+Canvas 3001 — and ship it to your
                door with its edition number. The file is never printed again.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="shirt">
        <div className="wrap">
          <h2>The shirt</h2>
          <div className="spec">
            <ul>
              <li>
                <b>Garment</b> <span>Bella+Canvas 3001 — unisex classic tee</span>
              </li>
              <li>
                <b>Fabric</b> <span>100% Airlume combed, ring-spun cotton</span>
              </li>
              <li>
                <b>Print</b> <span>Direct-to-garment, full front, 15.6″ × 19.3″</span>
              </li>
              <li>
                <b>Sizes</b> <span>XS – 4XL</span>
              </li>
              <li>
                <b>Edition</b> <span>1 of 1 — signed by its edition hash</span>
              </li>
              <li>
                <b>Shipping</b> <span>Worldwide, tracked, included in the price</span>
              </li>
            </ul>
            <div>
              <p style={{ color: "var(--ink-dim)", lineHeight: 1.75, fontSize: "16px" }}>
                DTG printing means there is no minimum run, no setup cost, and no reason for two
                shirts to ever be the same. So that&apos;s the whole idea: a store where{" "}
                <em style={{ color: "var(--ink)" }}>everything is one of one</em>. Your word is
                rendered at print resolution the moment you order and pressed into soft, breathable
                cotton that wears like a favorite from day one.
              </p>
              <div className="cta-row" style={{ justifyContent: "flex-start" }}>
                <a className="btn" href="/create">
                  Start with your word
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
