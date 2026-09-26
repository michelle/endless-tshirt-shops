import Configurator from "@/components/Configurator";

export default function Home() {
  return (
    <>
      <header className="site wrap">
        <a className="wordmark" href="/">SKY<span>B</span>ORN</a>
        <div className="tag">one sky · one shirt</div>
      </header>

      <section className="hero wrap">
        <div className="kicker">direct-to-garment · made to order</div>
        <h1>The sky, the night <em>it happened</em>.</h1>
        <p className="lede">
          Every Skyborn shirt is the real night sky — every star, constellation, planet and the moon,
          computed from your date, time and place — printed once, for one person.
        </p>
      </section>

      <Configurator />

      <section className="trio wrap">
        <div className="card">
          <h3>Real astronomy, not clip-art</h3>
          <p>
            We compute the positions of 1,600+ naked-eye stars, the visible planets and the exact moon
            phase for your minute, anywhere on Earth, back to 1900. If Orion stood over the hospital,
            Orion is on the shirt.
          </p>
        </div>
        <div className="card">
          <h3>Why DTG matters</h3>
          <p>
            Direct-to-garment printing has no screens, no minimums, no inventory — so a print run of one
            is just as vivid as a print run of a thousand. That&apos;s what makes a true one-of-one possible.
          </p>
        </div>
        <div className="card">
          <h3>Printed once, for one person</h3>
          <p>
            Your chart carries its own №, generated from your moment. The print file is created only after
            payment clears, and it is never reused — one sky, one shirt, one owner.
          </p>
        </div>
      </section>

      <section className="story wrap">
        <h2>HOW IT WORKS</h2>
        <p>
          Choose the moment — a birth, a wedding, a first date, a last goodbye. Tell us the place and the
          hour. We reconstruct the half-sky that stood above it, looking up, north at the top, and set it in
          ivory and gold.
        </p>
        <p>
          The Gildan Softstyle tee is printed to order and shipped in 4–8 business days. Free US shipping.
          If the moment you carry isn&apos;t for you, it makes the one gift that could not exist for anyone else.
        </p>
      </section>

      <footer className="site wrap">
        <div>
          <div className="caps">Skyborn</div>
          <div>One sky, one shirt. Printed once, for one person.</div>
        </div>
        <div>
          <div>Payments by Stripe · Fulfilment by Prodigi</div>
          <div>Star data: HYG database · Constellations: d3-celestial · Cities: GeoNames</div>
        </div>
      </footer>
    </>
  );
}
