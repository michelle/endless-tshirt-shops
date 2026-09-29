import Link from "next/link";
import { Mockup } from "@/components/Art";
import { PRODUCT, SHIPPING, formatMoney } from "@/lib/catalog";
import { DEFAULT_DESIGN, Design, formatMomentDate, packDesign } from "@/lib/design";

const EXAMPLES: { design: Design; label: string; blurb: string }[] = [
  {
    label: "The first date",
    blurb: "Brooklyn · a near-full moon rising in the east",
    design: DEFAULT_DESIGN,
  },
  {
    label: "Welcome to the world",
    blurb: "Lisbon · 6:12 in the morning",
    design: {
      ...DEFAULT_DESIGN,
      date: "2023-03-14", time: "06:12", tz: "Europe/Lisbon", lat: 38.7223, lon: -9.1393,
      place: "Lisbon, Portugal", title: "Hello, Inês", message: "you arrived with the morning stars",
      ink: "rose", color: "natural", names: false,
    },
  },
  {
    label: "The yes",
    blurb: "Reykjavík · under a winter sky",
    design: {
      ...DEFAULT_DESIGN,
      date: "2024-12-21", time: "23:30", tz: "Atlantic/Reykjavik", lat: 64.1466, lon: -21.9426,
      place: "Reykjavík, Iceland", title: "She Said Yes", message: "the longest night, the brightest one",
      ink: "aurora", color: "navy", grid: true,
    },
  },
];

const designLink = (d: Design) => `/design?d=${encodeURIComponent(packDesign(d))}`;

export default function Home() {
  const hero = EXAMPLES[0].design;
  return (
    <>
      <section className="wrap hero">
        <div>
          <p className="eyebrow">Custom star-map tees</p>
          <h1>
            Wear the sky <br />
            <em className="serif">from the night it happened.</em>
          </h1>
          <p className="lede">
            Give us a date, a time and a place. We calculate the exact sky above it: every star, the moon in its true phase,
            and the planets where they really stood. Then we print it on a shirt made for one person: you.
          </p>
          <div className="hero-actions">
            <Link href="/design" className="btn btn-gold">Design your sky</Link>
            <Link href="#examples" className="btn btn-ghost">See examples</Link>
          </div>
          <div className="hero-meta">
            <span>★ {formatMoney(PRODUCT.priceCents)} per tee</span>
            <span>★ Printed to order</span>
            <span>★ Ships to 22 countries</span>
          </div>
        </div>
        <div className="hero-art">
          <Mockup design={hero} id="hero" />
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <p className="eyebrow">How it works</p>
          <h2>No two shirts share a sky.</h2>
          <div className="steps">
            <div className="step">
              <div className="num">01</div>
              <h3>Choose the moment</h3>
              <p className="muted">A first date, a birth, a wedding, the night the team won. Search any town on Earth and set the time down to the minute.</p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h3>Make it yours</h3>
              <p className="muted">Add a title and a line of your own. Pick the garment colour and the ink: starlight, gilded, rosé or aurora. The preview updates as you type.</p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h3>We print & ship</h3>
              <p className="muted">Your chart is rendered at print resolution and printed direct-to-garment on a Bella+Canvas 3001, one shirt at a time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="examples">
        <div className="wrap">
          <p className="eyebrow">Skies our customers wear</p>
          <h2>Every moment has its own sky.</h2>
          <div className="examples">
            {EXAMPLES.map((ex, i) => (
              <Link key={i} href={designLink(ex.design)} className="example">
                <Mockup design={ex.design} id={`ex${i}`} />
                <div className="cap">
                  <strong>{ex.label}</strong>
                  <span>{ex.blurb} · {formatMomentDate(ex.design.date)}</span>
                  <br />
                  <span style={{ color: "var(--gold)" }}>Start from this design →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">Why Overhead</p>
          <h2>A real sky, not a decoration.</h2>
          <div className="features">
            <div className="feature">
              <h3>Astronomically accurate</h3>
              <p>2,300+ stars from the Yale Bright Star Catalogue, corrected for precession. The moon and planets come from a full ephemeris, so what you wear is what was really overhead.</p>
            </div>
            <div className="feature">
              <h3>Made for DTG</h3>
              <p>Direct-to-garment printing means no screens, no minimums and no stock. That&rsquo;s how every shirt can be a one-off. Inks are solid colours tuned to each garment.</p>
            </div>
            <div className="feature">
              <h3>What you see is what we print</h3>
              <p>The preview runs the same code as our print renderer. Your 4680 × 5790 px print file is generated from exactly the design you approved.</p>
            </div>
            <div className="feature">
              <h3>A premium blank</h3>
              <p>{PRODUCT.garment}. Soft, structured, and it keeps its shape wash after wash.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section faq" id="faq">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p className="eyebrow">Questions</p>
          <h2>Good to know</h2>
          <details>
            <summary>What if I don&rsquo;t know the exact time?</summary>
            <p>Pick your best guess. 9 PM is a lovely default. The sky turns about 15° an hour, so the constellations will be close, just rotated a little.</p>
          </details>
          <details>
            <summary>It was daytime. Will there be stars?</summary>
            <p>Yes. The chart shows the stars that were above the horizon at that moment, even if the sun hid them. It&rsquo;s the sky you would have seen if you could switch the sun off.</p>
          </details>
          <details>
            <summary>How much is shipping and how long does it take?</summary>
            <p>{formatMoney(SHIPPING.amountCents)} flat per order, tracked. Shirts are printed on demand, usually within 2–4 business days, and most orders arrive in {SHIPPING.minDays}–{SHIPPING.maxDays} business days.</p>
          </details>
          <details>
            <summary>Can I return a custom shirt?</summary>
            <p>Because each shirt is one of a kind, we can&rsquo;t take returns for change of mind. If anything arrives misprinted or damaged, we&rsquo;ll reprint it free. Just reply to your order email.</p>
          </details>
          <details>
            <summary>How does sizing run?</summary>
            <p>The Bella+Canvas 3001 is a true unisex fit. Size down for a closer fit and up for a relaxed one. Chest widths (flat): S 18&quot;, M 20&quot;, L 22&quot;, XL 24&quot;, 2XL 26&quot;.</p>
          </details>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <h2>What was above you?</h2>
          <p className="muted" style={{ marginBottom: 28 }}>It takes about a minute to find out.</p>
          <Link href="/design" className="btn btn-gold">Design your sky</Link>
        </div>
      </section>
    </>
  );
}
