import Designer from "../components/Designer";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>
          You get about <span className="accent">4,000 Fridays</span>.<br />
          Wear yours.
        </h1>
        <p className="lede">
          Every shirt is generated to order from your birth date: one dot for
          every week you&apos;ve been alive, the week you&apos;re living now
          ringed in your accent colour, and the rest of your 4,160 weeks
          waiting as faint dots. Printed with direct-to-garment ink, made only
          for you — no two shirts are alike, and no two people&apos;s dots line
          up the same way.
        </p>
        <p className="dots-strip" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <span key={i} className={`dot ${i === 18 ? "now" : i > 18 ? "dim" : ""}`} />
          ))}
        </p>
      </section>

      <Designer />

      <section id="how" className="section">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="num">01 — You</span>
            <h3>Tell us your name and birth date</h3>
            <p>
              The life calendar is computed from your exact birthday: every
              completed week of your life becomes a solid dot on the grid.
            </p>
          </div>
          <div className="step">
            <span className="num">02 — The machine</span>
            <h3>Your artwork is generated, not stocked</h3>
            <p>
              There is no inventory and no design catalogue. Your print — all
              4,160 dots of it — is drawn to order and previewed exactly as it
              will be printed.
            </p>
          </div>
          <div className="step">
            <span className="num">03 — The printer</span>
            <h3>Direct-to-garment, after you pay</h3>
            <p>
              Payment is taken with Stripe. Only once it clears is your print
              file sent to a Prodigi print lab near you, pressed onto a
              Bella+Canvas 3001 tee, and shipped worldwide.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="section">
        <h2>Questions</h2>
        <dl className="faq">
          <dt>Is each shirt really one of a kind?</dt>
          <dd>
            Yes — the print is computed from your birth date, frozen at the day
            you order. Even twins born a week apart get visibly different
            shirts.
          </dd>
          <dt>What am I looking at?</dt>
          <dd>
            A life calendar: 80 rows of 52 dots, one row per year of your
            life, left to right, birth to age 80. Solid dots are weeks you have
            lived; the ringed dot is the week you are living right now; the
            faint dots are the weeks you have left (on an 80-year timeline).
          </dd>
          <dt>What is the shirt?</dt>
          <dd>
            A Bella+Canvas 3001 unisex tee — 100% combed and ring-spun cotton,
            crew neck, tailored fit — printed with water-based DTG inks for
            sharp detail and a soft hand feel. Available XS–4XL in five
            colours.
          </dd>
          <dt>What does it cost?</dt>
          <dd>
            $32 plus $6.99 flat shipping, worldwide. Taxes may apply at
            checkout.
          </dd>
          <dt>When does it ship?</dt>
          <dd>
            Orders are printed within 72–120 hours at the lab nearest to you
            (US, UK and EU labs), then handed to the courier. You&apos;ll get a
            shipping confirmation when it&apos;s on its way.
          </dd>
        </dl>
      </section>
    </>
  );
}
