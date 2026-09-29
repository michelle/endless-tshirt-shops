'use client';

import { useMemo } from 'react';
import StarfieldCanvas from '../components/StarfieldCanvas';
import TeeMockup from '../components/TeeMockup';
import { zonedToUtcMs, formatWhen, formatCoords } from '../lib/client-time';

// Famous nights, rendered live by the same engine that prints the shirts.
const SAMPLES = [
  {
    line1: 'One Small Step',
    city: { label: 'Houston, Texas', place: 'Houston, Texas', lat: 29.76, lng: -95.37, tz: 'America/Chicago' },
    date: '1969-07-20', time: '21:56',
    blurb: 'The sky over Mission Control the moment Apollo 11 touched down.',
    color: '#1b1c20',
  },
  {
    line1: 'The Night the Wall Fell',
    city: { label: 'Berlin, Germany', place: 'Berlin, Germany', lat: 52.52, lng: 13.405, tz: 'Europe/Berlin' },
    date: '1989-11-09', time: '23:00',
    blurb: 'November 9, 1989 — Berlin, as the checkpoints opened.',
    color: '#232c47',
  },
  {
    line1: 'Three Days of Music',
    city: { label: 'Bethel, New York', place: 'Bethel, New York', lat: 41.7, lng: -74.87, tz: 'America/New_York' },
    date: '1969-08-15', time: '21:00',
    blurb: 'Opening night of Woodstock, above a half-million people.',
    color: '#53575d',
  },
];

function sampleDesign({ line1, city, date, time }) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const t = zonedToUtcMs(y, m, d, h, mi, city.tz);
  return {
    t,
    lat: city.lat,
    lng: city.lng,
    line1,
    place: city.place,
    when: formatWhen(t, city.tz),
    coords: formatCoords(city.lat, city.lng),
    theme: 'dark',
  };
}

export default function Home() {
  const heroDesign = useMemo(() => sampleDesign(SAMPLES[0]), []);
  const samples = useMemo(() => SAMPLES.map((s) => ({ ...s, design: sampleDesign(s) })), []);

  return (
    <>
      <section className="hero">
        <StarfieldCanvas />
        <div className="wrap hero-inner">
          <div>
            <div className="eyebrow">Custom star map tees</div>
            <h1 className="display">
              The sky, the moment <em>everything changed.</em>
            </h1>
            <p className="lede">
              Pick a date, a time, and a place. We chart the exact night sky overhead —
              every star, every constellation, the moon as it was — and print it on a
              premium tee. No two shirts are ever the same.
            </p>
            <div className="hero-actions">
              <a className="btn" href="/create">Create your sky — $34</a>
              <a className="btn btn-ghost" href="#gallery">See famous nights</a>
            </div>
            <p className="price-note" style={{ marginTop: 16 }}>
              Printed on demand · Bella + Canvas 3001 · Free proof, always
            </p>
          </div>
          <div className="hero-art">
            <TeeMockup hex="#1b1c20" design={heroDesign} artWidth={620} />
          </div>
        </div>
      </section>

      <section className="section" id="gallery">
        <div className="wrap">
          <h2>Nights worth wearing</h2>
          <p className="sub">
            Every chart is computed from real star catalogues for the exact second and
            spot you choose — then printed just for you. Yours will be one of one.
          </p>
          <div className="gallery">
            {samples.map((s) => (
              <div className="card" key={s.line1}>
                <TeeMockup hex={s.color} design={s.design} artWidth={460} />
                <div className="caption">
                  <div className="t">“{s.line1}”</div>
                  <div className="d">{s.blurb}</div>
                  <div className="d" style={{ marginTop: 6, color: 'var(--gold)' }}>
                    {s.design.when} — {s.design.place}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="n">01</div>
              <h3>Mark your moment</h3>
              <p>
                A first kiss, a birth, the night you moved to a new city. Choose the date,
                time, and place — or let us use your current sky.
              </p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <h3>We chart the sky</h3>
              <p>
                Our engine computes the true visible sky from 1,289 catalogued stars, all
                88 constellations, and the moon’s exact phase — rendered as an
                original artwork with your dedication.
              </p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <h3>Printed, just yours</h3>
              <p>
                Printed to order with soft, durable direct-to-garment inks on a
                Bella + Canvas 3001, then shipped worldwide. Made once, made for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="details">
        <div className="wrap">
          <h2>The details</h2>
          <div className="facts">
            <div className="fact"><span className="tick">✦</span><span><b>Astronomically real.</b> Computed from the Yale Bright Star data, matched to your exact time and coordinates.</span></div>
            <div className="fact"><span className="tick">✦</span><span><b>Truly one of one.</b> Your date, place, words and sky — no template, no repeats.</span></div>
            <div className="fact"><span className="tick">✦</span><span><b>Premium blank.</b> Bella + Canvas 3001, 100% combed cotton, pre-shrunk, unisex fit, XS–4XL.</span></div>
            <div className="fact"><span className="tick">✦</span><span><b>DTG print.</b> Water-based inks bonded into the fabric — soft hand feel, made to last.</span></div>
            <div className="fact"><span className="tick">✦</span><span><b>Made on demand.</b> No stock, no waste. Printed in 2–4 days, tracked shipping worldwide.</span></div>
            <div className="fact"><span className="tick">✦</span><span><b>Moon included.</b> The phase of the moon on your night, rendered as it was.</span></div>
          </div>
          <div style={{ marginTop: 44 }}>
            <a className="btn" href="/create">Start yours — $34</a>
          </div>
        </div>
      </section>
    </>
  );
}
