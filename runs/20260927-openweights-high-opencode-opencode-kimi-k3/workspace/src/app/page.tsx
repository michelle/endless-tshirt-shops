import Link from 'next/link';
import { encodeDesign } from '@/lib/design';
import { PRICE_CENTS, formatPrice } from '@/lib/shirts';

const SAMPLES: { title: string; caption: string; d: string; ink: string; bg: string }[] = [
  {
    title: 'ONE SMALL STEP',
    caption: 'Apollo 11 lifts off — July 16, 1969 · Cape Canaveral',
    d: encodeDesign({
      title: 'One Small Step',
      subtitle: 'July 16, 1969 · Cape Canaveral, FL',
      utcIso: '1969-07-16T13:32:00.000Z',
      lat: 28.573,
      lon: -80.649,
    }),
    ink: 'starlight',
    bg: '#17171b',
  },
  {
    title: 'AMANDA & THEO',
    caption: 'A sunset wedding — October 3, 2020 · Santorini',
    d: encodeDesign({
      title: 'Amanda & Theo',
      subtitle: 'October 3, 2020 · Santorini, Greece',
      utcIso: '2020-10-03T14:30:00.000Z',
      lat: 36.461,
      lon: 25.376,
    }),
    ink: 'midnight',
    bg: '#e6ddc6',
  },
  {
    title: 'HELLO 2000',
    caption: 'Midnight of the millennium — January 1, 2000 · Sydney',
    d: encodeDesign({
      title: 'Hello 2000',
      subtitle: 'January 1, 2000 · Sydney, Australia',
      utcIso: '1999-12-31T13:00:00.000Z',
      lat: -33.8688,
      lon: 151.2093,
    }),
    ink: 'gold',
    bg: '#232c3d',
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-stars" />
        <h1 className="display">THE SKY, EXACTLY AS IT WAS</h1>
        <p>
          Pick any moment that matters — a first kiss, a birth, the night everything changed — and
          we&apos;ll chart the real stars above that exact place at that exact minute, then print it
          on a shirt made just for you. No two are alike.
        </p>
        <Link href="/design" className="btn">
          Create yours — {formatPrice(PRICE_CENTS)}
        </Link>
        <p className="muted small" style={{ marginTop: 14 }}>
          Free worldwide shipping · Printed on demand
        </p>
      </section>

      <section className="section">
        <h2 className="display">EVERY SHIRT, A SINGLE MOMENT</h2>
        <p className="sub">
          Each chart is computed from the Yale Bright Star Catalog and shows the true stars,
          constellations and horizon for one moment in one place.
        </p>
        <div className="cards">
          {SAMPLES.map((s) => (
            <div className="card" key={s.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="art"
                style={{ background: s.bg }}
                src={`/api/design.png?d=${s.d}&ink=${s.ink}&w=900`}
                alt={`Star map shirt design: ${s.title}`}
                loading="lazy"
              />
              <div className="cap">
                <div className="t display">{s.title}</div>
                <div className="muted">{s.caption}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="how">
        <h2 className="display">HOW IT WORKS</h2>
        <p className="sub">Three steps between you and the most personal shirt you own.</p>
        <div className="steps">
          <div className="step">
            <div className="num">I</div>
            <h3>PICK YOUR MOMENT</h3>
            <p>
              A date, a time, a place. A proposal in Paris, a birth in Boise, kickoff in Kansas
              City.
            </p>
          </div>
          <div className="step">
            <div className="num">II</div>
            <h3>WE CHART THE SKY</h3>
            <p>
              We compute the exact visible sky — every star down to magnitude 5, real constellation
              lines, your horizon — for that minute.
            </p>
          </div>
          <div className="step">
            <div className="num">III</div>
            <h3>PRINTED &amp; SHIPPED</h3>
            <p>
              Your chart is printed with soft, water-based DTG inks on a premium tee and shipped
              straight to your door.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="shirt">
        <h2 className="display">THE SHIRT</h2>
        <p className="sub">
          A shirt this personal deserves a proper canvas. We print on the Bella+Canvas 3001 — the
          gold standard of print-on-demand tees.
        </p>
        <div className="specs">
          <div className="spec">
            <h3>PREMIUM COTTON</h3>
            <p>100% airlume combed, ring-spun cotton. Soft, pre-shrunk, side-seamed.</p>
          </div>
          <div className="spec">
            <h3>DTG PRINTING</h3>
            <p>
              Direct-to-garment water-based inks. Sharp stars, smooth gradients, no cracking.
            </p>
          </div>
          <div className="spec">
            <h3>SIX COLORS · XS–2XL</h3>
            <p>Six garment colors with ink pairings tuned for contrast, in unisex sizes XS–2XL.</p>
          </div>
          <div className="spec">
            <h3>SHIPPED WORLDWIDE</h3>
            <p>
              Printed in the facility closest to you across a global network, then dropped at your
              door.
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 46 }}>
          <Link href="/design" className="btn">
            Start designing
          </Link>
        </div>
      </section>
    </>
  );
}
