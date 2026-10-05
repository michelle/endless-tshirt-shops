import { money, SHIPPING_CENTS, SHIRT_CENTS, SIZES } from "../lib/colors.js";
import { SAMPLE_SPEC } from "../lib/sample.js";
import { renderMockupSVG } from "../lib/starmap.js";

export default function HomePage() {
  const svg = renderMockupSVG(SAMPLE_SPEC).replace(/<\?xml[^>]*\?>/, "").trim();
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Custom star-map tees</p>
          <h1>The sky, the night it mattered.</h1>
          <p className="lede">
            Name a date, an hour, and a place. We chart the stars that were overhead — a birth, a vow, the evening you landed somewhere new — and print that sky, once, on a shirt made only for you.
          </p>
          <div className="price-row">
            <div className="price">{money(SHIRT_CENTS)}</div>
            <span>plus {money(SHIPPING_CENTS)} shipping</span>
          </div>
          <a className="btn" href="/create">Chart a shirt</a>
          <p className="note">
            Direct-to-garment on a Bella+Canvas 3001. Nothing is sent to the printer until Stripe confirms payment.
          </p>
        </div>
        <div className="hero-shirt" dangerouslySetInnerHTML={{ __html: svg }} />
      </section>

      <section className="band">
        <p className="eyebrow">How it works</p>
        <div className="steps">
          <div className="step">
            <strong>01 — The moment</strong>
            A title, a dedication if you want one, and the local time at a real place. The chart uses that time zone, not a generic sky.
          </div>
          <div className="step">
            <strong>02 — The sky</strong>
            An azimuthal chart of everything above the horizon. North is up. The small ring in the center is the zenith, the point directly overhead.
          </div>
          <div className="step">
            <strong>03 — The shirt</strong>
            After payment, a print-ready file is generated and the order is placed with Prodigi. They print it nearby and ship it to the address you gave Stripe.
          </div>
        </div>
      </section>

      <section className="band" id="garment">
        <div className="band-grid">
          <div>
            <p className="eyebrow">The garment</p>
            <h2>A shirt people actually wear.</h2>
            <p>
              Bella+Canvas 3001, unisex, tailored rather than boxy. 100% combed cotton on the solid colors. Heather includes a little polyester. Printed with water-based inks, so the chart sits in the cloth instead of on a plasticky patch.
            </p>
            <p>
              The graphic is a 10-inch medallion on the chest, not an all-over flood and not a tiny logo. Light ink on dark shirts, deep indigo and copper on light ones. The background of the file is transparent, so only the chart is printed.
            </p>
          </div>
          <div>
            <table>
              <thead>
                <tr><th>Size</th><th>Chest</th><th>Length</th></tr>
              </thead>
              <tbody>
                {SIZES.filter((s) => !["xs", "4xl"].includes(s.id)).map((s) => (
                  <tr key={s.id}><td>{s.label}</td><td>{s.chest}</td><td>{s.length}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="note">Chest is the full circumference, from Prodigi’s Bella+Canvas 3001 spec. The cut is fitted. Size up if you want it loose. XS and 4XL are available at checkout.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
