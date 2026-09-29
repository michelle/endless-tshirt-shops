import Configurator from "./Configurator";

const EXAMPLES = [
  {
    caption: "Reykjavík · 24 Dec 2021 · 23:45 — “the night we said yes”",
    params: "label=Reykjav%C3%ADk%2C+Iceland&lat=64.1466&lon=-21.9426&ms=1640389500000&tz=Atlantic%2FReykjavik&caption=the+night+we+said+yes&color=black&size=m",
  },
  {
    caption: "New York · 14 Jul 2023 · 20:10 — “where we met”",
    params: "label=New+York%2C+USA&lat=40.7128&lon=-74.006&ms=1689379800000&tz=America%2FNew_York&caption=where+we+met&color=navy+blue&size=m",
  },
  {
    caption: "Sydney · 02 Nov 2019 · 13:30 — “she said hello at noon”",
    params: "label=Sydney%2C+Australia&lat=-33.8688&lon=151.2093&ms=1572661800000&tz=Australia%2FSydney&caption=she+said+hello+at+noon&color=white&size=m",
  },
];

export default function Home() {
  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="hero-top">
            <div className="brand">
              MERIDIAN
              <small>SKY KEEPSAKE TEES</small>
            </div>
            <div className="hero-badge">PRINTED TO ORDER · ONE OF ONE</div>
          </div>

          <div className="hero-grid">
            <div>
              <h1>
                Wear the exact sky from <em>your moment</em>.
              </h1>
              <p className="lede">
                Pick a place and a time — the first dance, the night you met, the morning everything changed.
                We compute the real sun, moon and stars for that instant on Earth and print them on a
                premium cotton tee, just for you. No two are ever alike.
              </p>
              <div className="hero-cta">
                <a className="btn btn-gold" href="#make">Design your tee</a>
                <a className="btn btn-ghost" href="#examples">See examples</a>
              </div>
            </div>
            <div className="hero-shirt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/preview?${EXAMPLES[0].params}`}
                alt="Meridian sky tee example — Reykjavík night sky"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <h2 className="block-title">How it works</h2>
          <p className="block-sub">Real astronomy, real garments, zero inventory.</p>
          <div className="steps">
            <div className="step">
              <div className="num">01</div>
              <h3>Tell us the moment</h3>
              <p>Search 2,400 cities or drop a pin anywhere on Earth, then set the date and local time that matters to you.</p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h3>We chart the real sky</h3>
              <p>Solar position, the day&rsquo;s sun path, moon phase and a star field are computed for that exact instant and drawn as your personal sky chart.</p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h3>Printed after you pay</h3>
              <p>Your design is direct-to-garment printed on a Bella+Canvas 3001 tee and shipped by our print partner, Prodigi — only once your payment has cleared.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="examples" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="block-title">Moments, made wearable</h2>
          <p className="block-sub">Every design below is computed from a real place and a real time.</p>
          <div className="gallery">
            {EXAMPLES.map((e) => (
              <figure key={e.params}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/preview?${e.params}`} alt={e.caption} loading="lazy" />
                <figcaption>{e.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="block" id="make">
        <div className="wrap">
          <Configurator />
        </div>
      </section>

      <footer className="site">
        <div className="wrap">
          <div>
            <b>MERIDIAN</b>
            <p>Sky keepsake tees. Sun-path astronomy computed in-house; printed on demand via the Prodigi print network; payments secured by Stripe.</p>
          </div>
          <div>
            <p>
              Built with real solar &amp; lunar math · Bella+Canvas 3001 · DTG front print<br />
              Questions? <a href="mailto:hello@meridian.example">hello@meridian.example</a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
