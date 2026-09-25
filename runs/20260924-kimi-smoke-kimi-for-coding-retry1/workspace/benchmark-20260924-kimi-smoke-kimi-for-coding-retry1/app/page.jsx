import Customizer from '@/components/Customizer';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>
          Wear the night<br />
          <em>your sky changed.</em>
        </h1>
        <p className="sub">
          A first kiss. A birth. A farewell. Enter the date, time and place — we chart the actual
          stars, moon and constellations that hung above you, and print them on a premium tee,
          one at a time, just for you.
        </p>
        <div className="steps">
          <span><b>01</b>Pick your moment</span>
          <span><b>02</b>We chart the real sky</span>
          <span><b>03</b>DTG-printed &amp; shipped</span>
        </div>
      </section>

      <Customizer />

      <section className="sectionhead" id="how">
        <h2>A map of one moment, computed for one person</h2>
        <p>
          Every order recalculates the heavens from scratch: 1,700+ stars from the Yale Bright Star
          Catalogue, constellation figures, and the moon’s phase for your exact date, time and
          coordinates. No two SKYWRITER shirts are ever the same.
        </p>
      </section>
      <div className="cards">
        <div className="card">
          <h3>Astronomically real</h3>
          <p>
            Star positions are computed with proper sidereal-time math for your longitude and
            latitude — the same sky an observer would have seen, rendered as a zenith-facing chart.
          </p>
        </div>
        <div className="card">
          <h3>Made for DTG</h3>
          <p>
            The artwork is rendered at 300 DPI for the full 15.6″ × 19.3″ print area of a
            Bella+Canvas 3001 and direct-to-garment printed by Prodigi’s global lab network.
          </p>
        </div>
        <div className="card">
          <h3>Printed after you pay</h3>
          <p>
            Your shirt is sent to the printer only once your payment has cleared — never before.
            You get live production status from the print floor to your door.
          </p>
        </div>
      </div>
    </>
  );
}
