import Link from "next/link";
import { HeroArt } from "@/components/HeroArt";
import { Gallery } from "@/components/Gallery";
import { money, PRODUCT } from "@/lib/design";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Made for one date. Printed for one person.</div>
          <h1>
            The solar system, <em>the day you arrived.</em>
          </h1>
          <p className="lede">
            Pick a date. We compute exactly where Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune were,
            plus the moon that night, and print it on a soft cotton tee with your name on it. No two are alike.
          </p>
          <div className="hero-cta">
            <Link href="/design" className="btn btn-primary btn-lg">
              Design yours — {money(PRODUCT.priceCents)}
            </Link>
            <a href="#how" className="btn btn-ghost btn-lg">
              How it works
            </a>
          </div>
          <div className="hero-meta">
            <span>Birthdays · anniversaries · new arrivals</span>
            <span>Ships worldwide</span>
            <span>Printed to order</span>
          </div>
        </div>
        <HeroArt />
      </section>

      <section>
        <h2 className="section-title">Some dates worth wearing</h2>
        <p className="section-sub">Tap any shirt to open it in the designer and swap in your own date.</p>
        <Gallery />
      </section>

      <section id="how">
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">Direct-to-garment printing means every shirt is made individually, so yours can be truly yours.</p>
        <div className="grid-3">
          <div className="card">
            <div className="step-num">01</div>
            <h3>Choose a date</h3>
            <p>A birthday, a wedding, the day you met, the day they were born. Anything from 1900 to 2050.</p>
          </div>
          <div className="card">
            <div className="step-num">02</div>
            <h3>We compute the sky</h3>
            <p>Planet positions come from JPL orbital elements. Earth is highlighted in your accent colour, with the moon phase beside the date.</p>
          </div>
          <div className="card">
            <div className="step-num">03</div>
            <h3>Printed and shipped</h3>
            <p>Your design is rendered at 300 DPI and printed to order on a Bella+Canvas 3001 tee. Typical delivery 5–12 business days.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">The shirt</h2>
        <div className="spec-list">
          <div className="spec"><b>Bella+Canvas 3001</b><span>Unisex retail fit, 100% ring-spun cotton, side-seamed.</span></div>
          <div className="spec"><b>Direct-to-garment</b><span>Water-based ink absorbed into the fabric. Soft hand, no plastic feel.</span></div>
          <div className="spec"><b>7 colours · XS–3XL</b><span>Black, navy, heather grey, military green, maroon, white and natural.</span></div>
          <div className="spec"><b>{money(PRODUCT.priceCents)} + {money(PRODUCT.shippingCents)} shipping</b><span>Flat-rate worldwide. Secure checkout by Stripe.</span></div>
        </div>
      </section>

      <section id="faq">
        <h2 className="section-title">Questions</h2>
        <div className="faq">
          <div>
            <h4>How accurate are the planet positions?</h4>
            <p>We use the JPL approximate Keplerian elements, good to a fraction of a degree between 1800 and 2050. On the shirt, that is far smaller than the planet dot itself.</p>
          </div>
          <div>
            <h4>Why does the diagram not look to scale?</h4>
            <p>Real orbits span a factor of 80 in distance. We blend linear and logarithmic spacing so the inner planets stay readable. Angles are exact.</p>
          </div>
          <div>
            <h4>Will fine lines print well?</h4>
            <p>Yes. Every line and dot in the design is at least 1.2 mm wide, and the file is sent at 300 DPI with solid ink only, which is what DTG likes.</p>
          </div>
          <div>
            <h4>What about returns?</h4>
            <p>Each shirt is made to your date, so we cannot resell it. If anything arrives damaged or misprinted, reply to your confirmation email and we will reprint it.</p>
          </div>
          <div>
            <h4>Is the moon phase right for my time zone?</h4>
            <p>The phase is computed for midday UTC on your date. The moon moves about 12° a day, so the glyph is correct to within a few hours anywhere on Earth.</p>
          </div>
          <div>
            <h4>Can I write anything in the caption?</h4>
            <p>Up to 24 characters for the main line and 40 for the small line. Latin letters, numbers and common punctuation are supported.</p>
          </div>
        </div>
      </section>
    </>
  );
}
