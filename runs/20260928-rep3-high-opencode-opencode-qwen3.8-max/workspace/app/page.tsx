import Customizer from '@/components/Customizer';
import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/">
          STARRYBORN
          <small>wear the night you were born</small>
        </a>
        <nav>
          <Link href="/#studio">Design yours</Link>
          <Link href="/info">Details</Link>
        </nav>
      </header>

      <section className="hero">
        <p className="kicker">computed astronomy · printed to order</p>
        <h1>
          The exact sky from the moment you were born, <em>printed on a shirt made only for you.</em>
        </h1>
        <p className="lede">
          Give us a date, a time and a place. We compute the real positions of nearly 3,000
          stars, the constellations, and the moon’s phase for that minute — then direct-to-garment
          print your sky onto a premium tee. No two shirts alike, because no two first nights are.
        </p>
      </section>

      <section id="studio">
        <Customizer />
      </section>

      <section className="how">
        <div className="panel">
          <h3>✦ Real astronomy</h3>
          <p>
            Every chart is computed at order time from the HYG stellar catalogue — sidereal time,
            precession, atmospheric refraction, the moon’s true phase. If you were born at noon,
            we even show where the sun stood. This is your sky, not a stock clip-art zodiac.
          </p>
        </div>
        <div className="panel">
          <h3>✦ Made for one</h3>
          <p>
            Direct-to-garment printing means your design is rendered at 300 DPI and printed
            directly onto a Bella&nbsp;+&nbsp;Canvas 3001 the moment your payment clears —
            a run of exactly one, in the colour, size and ink style you chose.
          </p>
        </div>
        <div className="panel">
          <h3>✦ Printed &amp; shipped</h3>
          <p>
            Payment is handled by Stripe. Only after it succeeds does your shirt go to our
            print partner Prodigi, which produces and ships it white-label from the lab
            closest to you. Track it any time from your order page.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <p>
          STARRYBORN · star data: HYG database (CC-BY-SA 4.0) · fonts: Cinzel &amp; Cormorant
          Garamond (SIL OFL)
        </p>
        <p>
          <Link href="/info">Shipping, returns &amp; the fine print</Link>
        </p>
      </footer>
    </main>
  );
}
