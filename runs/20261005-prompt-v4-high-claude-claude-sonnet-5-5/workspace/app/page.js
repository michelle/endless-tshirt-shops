import Designer from '@/components/Designer';
import Shirt from '@/components/Shirt';
import { Footer, Nav } from '@/components/SiteChrome';
import { config } from '@/lib/config.js';
import { DEFAULT_DESIGN, SHIRTS } from '@/lib/design.js';

export const dynamic = 'force-dynamic';

const heroQuery = new URLSearchParams({
  title: DEFAULT_DESIGN.title, line: DEFAULT_DESIGN.line, place: DEFAULT_DESIGN.place, lat: DEFAULT_DESIGN.lat, lon: DEFAULT_DESIGN.lon,
  tz: DEFAULT_DESIGN.tz, date: DEFAULT_DESIGN.date, time: DEFAULT_DESIGN.time, shirt: 'black', theme: 'starlight', size: 'm', lines: '1', planets: '1',
}).toString();

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <section className="wrap hero">
          <div>
            <div className="eyebrow">Custom star-map tees</div>
            <h1>Wear the sky from <em>the night</em> that mattered.</h1>
            <p className="lead">
              Give us a date, a time and a place, and we calculate the exact stars, planets and moon phase that were overhead — then print
              that sky, with your words beneath it, on a soft cotton tee. No two are ever the same.
            </p>
            <a className="btn" href="#design">Design your sky</a>
          </div>
          <div className="hero-art">
            <div className="shirtwrap"><Shirt color={SHIRTS.black.hex} tone="dark" src={`/api/preview?${heroQuery}`} alt="Star map for 14 June 2019 over Paris" /></div>
          </div>
        </section>

        <section className="wrap points">
          <div className="point"><h3>Astronomically exact</h3><p>Real positions of 1,500+ stars, constellations, the Moon and planets, calculated for your coordinates, local time zone and date — back to 1800.</p></div>
          <div className="point"><h3>One of one</h3><p>Your headline, place and personal line are set in the artwork. We print it fresh for you using direct-to-garment inks — never from stock.</p></div>
          <div className="point"><h3>Made to be gifted</h3><p>Birthdays, weddings, anniversaries, new babies, the night you moved in. Pick the colour, the ink and the size, and we ship straight to the door.</p></div>
        </section>

        <section className="wrap">
          <div className="section-title">
            <h2>Design your night sky</h2>
            <p>Everything updates live. What you see is what gets printed.</p>
          </div>
          <Designer demoMode={config.demoPayments} paymentsReady={config.paymentsReady} />
        </section>

        <section className="wrap faq">
          <div className="section-title"><h2>Good to know</h2></div>
          <details><summary>How accurate is the sky?</summary><p>We compute each star&apos;s position from a catalogue of naked-eye stars, corrected for precession, using your local sidereal time. The Moon and planets use an ephemeris, so phases and positions are right for the date you choose.</p></details>
          <details><summary>What if I don&apos;t know the exact time?</summary><p>Pick the closest time you can. The sky rotates about 15° per hour, so being an hour off shifts the whole pattern slightly but keeps the same constellations.</p></details>
          <details><summary>How will the print look and last?</summary><p>Your design is printed directly into the fabric of a 100% cotton Gildan Softstyle tee, so it feels soft rather than stiff. Wash inside out in cold water for best results.</p></details>
          <details><summary>How long does delivery take?</summary><p>Each shirt is made to order. Expect roughly 5–12 business days depending on where you live.</p></details>
          <details><summary>Can I return it?</summary><p>Because each shirt is made to your design, we can&apos;t accept change-of-mind returns — but if it arrives damaged or misprinted, we&apos;ll reprint it. See our <a href="/policies">policies</a>.</p></details>
        </section>
      </main>
      <Footer />
    </>
  );
}
