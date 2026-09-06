import { CATALOG, CATALOG_PRICE, CUSTOM_PRICE, formatUsd } from "@/lib/catalog";
import { artUrl, markUrl } from "@/lib/art";
import { ShirtMockup } from "@/components/ShirtMockup";
import { designSubtitle } from "@/lib/design";

const HERO = CATALOG[0];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Elementary cellular automata</p>
            <h1 className="hero-title">
              Eight bits of
              <br />
              rule. One shirt.
            </h1>
            <p className="hero-lede">
              An elementary cellular automaton is three cells of input, one cell
              of output, and an eight-bit number that decides between them. That
              is the entire specification. Run it for a few hundred generations
              and it produces <strong>fractals, gliders, traffic jams and
              certified randomness</strong> — none of which anybody put there.
            </p>
            <p className="hero-lede">
              We render them at print resolution and put them on heavyweight
              cotton. From {formatUsd(CATALOG_PRICE)}.
            </p>
            <div className="row">
              <a className="btn btn-primary" href="#catalog">
                See the collection
              </a>
              <a className="btn" href="/design">
                Design your own
              </a>
            </div>
          </div>
          <div>
            <ShirtMockup
              artUrl={artUrl(HERO.design, 900)}
              garmentId={HERO.garmentId}
              alt={`${HERO.name} — ${HERO.tagline}`}
            />
          </div>
        </div>
      </section>

      <section className="section" id="catalog">
        <div className="wrap">
          <div className="section-head">
            <h2 className="section-title">The collection</h2>
            <span className="section-note">
              Eight rules worth the cotton · {formatUsd(CATALOG_PRICE)} each
            </span>
          </div>
          <div className="grid">
            {CATALOG.map((item) => (
              <a key={item.slug} className="card" href={`/product/${item.slug}`}>
                <div className="card-media">
                  <ShirtMockup
                    artUrl={artUrl(item.design, 560)}
                    garmentId={item.garmentId}
                    alt={`${item.name} t-shirt`}
                  />
                </div>
                <p className="card-rule">{item.name.toUpperCase()}</p>
                <p className="card-tag">{item.tagline}</p>
                <p className="card-price">
                  {formatUsd(CATALOG_PRICE)} · {designSubtitle(item.design)}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Or take the other 248</p>
            <h1 className="hero-title" style={{ fontSize: "clamp(30px, 3.6vw, 44px)" }}>
              Every rule. Every seed.
            </h1>
            <p className="hero-lede">
              Move one slider for the rule, type six hex characters for the seed,
              and you have a design that almost certainly nobody has ever worn.
              We render it live, warn you if it dies out or fills in solid, and
              print exactly what you approved.
            </p>
            <p className="hero-lede mono" style={{ fontSize: 13 }}>
              256 rules × 16<sup>6</sup> seeds × 71 lattice widths
            </p>
            <a className="btn btn-primary" href="/design">
              Open the designer — {formatUsd(CUSTOM_PRICE)}
            </a>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              opacity: 0.9,
            }}
          >
            {[110, 45, 105, 73, 150, 30, 26, 154, 62].map((rule, i) => (
              <div
                key={rule}
                style={{
                  aspectRatio: "1",
                  background: "#0b0b0e",
                  border: "1px solid var(--line)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={markUrl(
                    {
                      rule,
                      seed: `A${rule.toString(16).toUpperCase().padStart(2, "0")}F1${i}`.slice(0, 6),
                      seeding: i % 3 === 0 ? "single" : "random",
                      ink: "bone",
                      cells: 81,
                    },
                    260,
                  )}
                  alt={`Rule ${rule}`}
                  style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
