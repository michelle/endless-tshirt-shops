import Link from "next/link";
import DesignArt from "@/components/DesignArt";
import ShirtMockup from "@/components/ShirtMockup";
import { SHIRT_COLORS } from "@/lib/types";

const SHOWCASE: { phrase: string; palette: "signal" | "ember" | "tidal" | "citrus"; shirt: "black" | "white" | "navy" }[] = [
  { phrase: "BORN 04.12.1996", palette: "signal", shirt: "black" },
  { phrase: "TEAM PIXEL", palette: "citrus", shirt: "white" },
  { phrase: "STILL HERE", palette: "tidal", shirt: "navy" },
  { phrase: "LET'S GO MOM", palette: "ember", shirt: "black" },
];

export default function HomePage() {
  return (
    <div>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">One-of-one, printed to order</p>
          <h1>
            Wear your own code.
            <br />
            Not a design. A cipher.
          </h1>
          <p className="hero-copy">
            Type a name, a date, a lyric — anything. We turn those exact words into a
            unique radial pattern that only that phrase can produce, then print it
            direct-to-garment onto a shirt, one at a time. Same phrase always makes the
            same pattern — nobody else will get yours.
          </p>
          <div className="hero-actions">
            <Link href="/design" className="btn btn-primary">
              Build your tee
            </Link>
            <a href="#how" className="btn btn-ghost">
              How it works
            </a>
          </div>
        </div>
      </section>

      <section className="showcase">
        <div className="container">
          <div className="showcase-grid">
            {SHOWCASE.map((s, i) => (
              <ShirtMockup key={i} color={SHIRT_COLORS[s.shirt].hex}>
                <DesignArt
                  spec={{ phrase: s.phrase, paletteId: s.palette, shirtColorId: s.shirt }}
                  width={170}
                  height={210}
                />
              </ShirtMockup>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="how-it-works">
        <div className="container">
          <h2>How it works</h2>
          <ol className="steps">
            <li>
              <span className="step-num">01</span>
              <h3>Type your phrase</h3>
              <p>A name, a date, a quote — up to 28 characters. Pick a palette and a shirt color.</p>
            </li>
            <li>
              <span className="step-num">02</span>
              <h3>We generate your cipher</h3>
              <p>
                Your exact text deterministically drives every bar, length, and color in the
                pattern. Same input, same output — always. It's your fingerprint, not a template.
              </p>
            </li>
            <li>
              <span className="step-num">03</span>
              <h3>Printed on demand</h3>
              <p>
                Pay securely with Stripe. Only after payment succeeds do we send your exact file to
                our DTG print partner, who prints and ships your one-off shirt.
              </p>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
