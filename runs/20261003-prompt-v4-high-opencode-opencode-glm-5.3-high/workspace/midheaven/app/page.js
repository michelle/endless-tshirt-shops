import Link from 'next/link'
import { Header, Footer } from '@/components/Chrome'
import SkyChart from '@/components/SkyChart'
import { SAMPLES, GALLERY } from '@/lib/samples'
import { PRICE_CENTS } from '@/lib/spec'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* ---------------- hero ---------------- */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="kicker">Custom night-sky tees · printed on demand</p>
              <h1 className="display">
                The sky, the night it&nbsp;all&nbsp;began.
              </h1>
              <p className="lede">
                Every star, every constellation, the Moon and the wandering planets — computed
                for the exact place and moment that matter to you, and printed on a premium
                cotton tee. No two shirts we will ever print are the same, because no two skies
                are.
              </p>
              <div className="cta-row">
                <Link href="/create" className="btn btn-big">
                  Map your night — ${(PRICE_CENTS / 100).toFixed(0)}
                </Link>
                <Link href="/#gallery" className="btn btn-ghost btn-big">
                  See real designs
                </Link>
              </div>
              <p className="hero-note">
                unisex Bella+Canvas 3001 · 8 colours · XS–4XL · free world shipping
              </p>
            </div>
            <div className="hero-art">
              <SkyChart spec={SAMPLES.moon.spec} />
              <div className="hero-caption">
                THE NIGHT WE WALKED ON THE MOON · 20 JUL 1969 · TRANQUILITY BASE
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- how it works ---------------- */}
        <section id="how">
          <div className="wrap">
            <p className="kicker">№ 01 — How it works</p>
            <h2 className="display">Three steps to a sky only you remember.</h2>
            <div className="steps">
              <div className="step">
                <div className="num">/ I</div>
                <h3>Choose the moment</h3>
                <p>
                  A birth, a first meeting, a wedding, a last goodbye. Give us the date, the
                  hour and the place — a small town or a far coast, anywhere on Earth (or on the
                  Moon, for that matter).
                </p>
              </div>
              <div className="step">
                <div className="num">/ II</div>
                <h3>We compute your sky</h3>
                <p>
                  Our engine calculates the position of ~800 stars visible that hour, traces all
                  88 constellations, and places the Moon with its true phase and the planets
                  where they stood.
                </p>
              </div>
              <div className="step">
                <div className="num">/ III</div>
                <h3>Wear it</h3>
                <p>
                  Direct-to-garment printed — the ink soaks into the cotton, so it moves and
                  washes like the fabric itself. Produced at the print lab nearest you and
                  shipped in plain, protective packaging.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- gallery ---------------- */}
        <section id="gallery">
          <div className="wrap">
            <p className="kicker">№ 02 — Real designs, computed live</p>
            <h2 className="display">Each of these was somebody&apos;s night.</h2>
            <p className="lede">
              These aren&apos;t mockups of an idea — every chart below is calculated, right now,
              by the same engine that will print your shirt. Tap one to make it yours.
            </p>
            <div className="gallery">
              {GALLERY.map((key) => {
                const s = SAMPLES[key]
                return (
                  <Link key={key} href={`/create?sample=${key}`} className="sample">
                    <SkyChart spec={s.spec} />
                    <div>
                      <div className="cap">{s.caption}</div>
                      <div className="sub">
                        {s.spec.p.toUpperCase()} · {s.spec.d} · {s.spec.tm}
                      </div>
                    </div>
                    <div className="go">START FROM THIS SKY →</div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ---------------- quality ---------------- */}
        <section id="quality">
          <div className="wrap split">
            <div>
              <p className="kicker">№ 03 — The shirt &amp; the ink</p>
              <h2 className="display">A night sky deserves better than a sticker.</h2>
              <p className="lede">
                Direct-to-garment printing sprays water-based ink directly into the weave —
                no plastic transfer sheet sitting on top. The chart becomes part of the shirt:
                soft, breathable, and still yours after fifty washes.
              </p>
              <ul className="spec-list">
                <li>
                  <span className="tick">✶</span>
                  <span>
                    <b>Bella+Canvas 3001</b> — the streetwear standard: Airlume combed &amp;
                    ring-spun cotton, tailored unisex fit, side-seamed so it doesn&apos;t twist
                    in the wash.
                  </span>
                </li>
                <li>
                  <span className="tick">✶</span>
                  <span>
                    <b>Your art at 300 dpi</b> — we generate a 4680 × 5790 pixel print file for
                    every single order, with fine hairlines and typography set in Cinzel &amp;
                    IBM Plex Mono.
                  </span>
                </li>
                <li>
                  <span className="tick">✶</span>
                  <span>
                    <b>Fulfilled near you</b> — printed at the closest of three labs (US, UK,
                    EU) and shipped white-label, usually within 3–5 working days.
                  </span>
                </li>
                <li>
                  <span className="tick">✶</span>
                  <span>
                    <b>Wash like you mean it</b> — machine wash cold, inside out; the water-based
                    inks are OEKO-TEX certified and built to outlast the shirt.
                  </span>
                </li>
              </ul>
            </div>
            <SkyChart spec={SAMPLES.met.spec} />
          </div>
        </section>

        {/* ---------------- faq ---------------- */}
        <section id="faq" className="faq">
          <div className="wrap">
            <p className="kicker">№ 04 — Questions</p>
            <h2 className="display">Before you ask.</h2>
            <details>
              <summary>Is the sky really accurate?</summary>
              <p>
                Yes — to within a few arcminutes. We compute sidereal time for your exact
                timestamp and coordinates, then place ~800 naked-eye stars from the HYG
                catalogue, trace the 88 official constellations, and position the Moon (with its
                true phase) and Mercury, Venus, Mars, Jupiter and Saturn with a proper
                ephemeris. If Jupiter was rising over your harbour that night, it is rising over
                your chest now.
              </p>
            </details>
            <details>
              <summary>What if I don&apos;t know the exact time?</summary>
              <p>
                Close is beautiful. The sky drifts about one degree every four minutes, so even
                an hour off only shifts the chart slightly. A good rule: evening stories are
                usually told around 21:00–23:00 — or ask whoever was there; they remember more
                than they think.
              </p>
            </details>
            <details>
              <summary>How is this printed?</summary>
              <p>
                Direct-to-garment (DTG): your chart is printed into the fabric with
                water-based inks, which is why every shirt can be a completely different sky —
                there are no screens, plates or minimum orders. We recommend the deep colours
                (black, navy, asphalt) because the ivory chart reads like the night itself.
              </p>
            </details>
            <details>
              <summary>Shipping, returns, and care?</summary>
              <p>
                Free worldwide shipping, produced at the lab nearest your address and dispatched
                typically within 3–5 working days. Because each shirt is computed and printed
                for one person only, we can&apos;t accept returns of personalised designs — but
                if anything arrives damaged or misprinted, we reprint it, no questions asked.
                Wash cold, inside out, and skip the tumble dryer for the longest life.
              </p>
            </details>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
