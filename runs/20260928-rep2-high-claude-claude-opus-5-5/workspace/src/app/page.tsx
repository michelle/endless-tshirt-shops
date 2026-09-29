import Link from "next/link";
import Example from "@/components/Example";
import { EXAMPLES, HERO } from "@/lib/examples";
import { PRICE_CENTS } from "@/lib/catalog";

export default function Home() {
  return (
    <main>
      <section className="wrap hero">
        <div>
          <div className="eyebrow">Custom star map tees</div>
          <h1>Wear the sky from the night that changed everything.</h1>
          <p className="lead">
            Pick a place and a moment — a first date, a birth, a summit, a “yes”. We calculate the exact sky that was
            overhead, down to the minute: every star, the Moon in its real phase, the planets where they actually were.
            Then we print it, just for you, on a premium tee.
          </p>
          <div className="ctas">
            <Link className="btn" href="/design">Design your sky →</Link>
            <Link className="btn ghost" href="#gallery">See examples</Link>
          </div>
          <div className="badges">
            <span>Astronomically accurate</span>
            <span>One-of-one, printed to order</span>
            <span>${PRICE_CENTS / 100} · ships worldwide</span>
          </div>
        </div>
        <div className="hero-shirt">
          <Example design={HERO} link={false} />
        </div>
      </section>

      <section id="how" className="section">
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2>No two shirts are the same sky.</h2>
          <div className="steps">
            <div className="step">
              <div className="n">1</div>
              <h3>Choose the moment</h3>
              <p className="muted">Search any town on Earth and set the date and local time — anywhere from 1800 to 2200.</p>
            </div>
            <div className="step">
              <div className="n">2</div>
              <h3>Make it yours</h3>
              <p className="muted">Add a title and a line of your own, pick a shirt colour, and choose how much of the heavens to show.</p>
            </div>
            <div className="step">
              <div className="n">3</div>
              <h3>We print &amp; ship</h3>
              <p className="muted">Your chart is rendered at 300 dpi and printed direct-to-garment on a Bella + Canvas 3001 tee, then shipped to your door.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="gallery" className="section">
        <div className="wrap">
          <div className="eyebrow">Gallery</div>
          <h2>Moments people wear.</h2>
          <p className="muted">Tap any shirt to start from its design.</p>
          <div className="gallery">
            {EXAMPLES.map((e) => (
              <Example key={e.design.title} design={e.design} caption={e.caption} />
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="wrap">
          <div className="eyebrow">Questions</div>
          <h2>Good to know</h2>
          <div className="faq">
            <div>
              <h3>Is it really the sky from that moment?</h3>
              <p className="muted">
                Yes. We compute positions for ~1,600 naked-eye stars, the Moon (with its true phase and orientation) and
                the five bright planets, for your exact latitude, longitude and time, accounting for precession and time
                zones (including daylight saving). The chart is a view straight up, with north at the top and east on the left
                — just like lying on your back looking at the sky.
              </p>
            </div>
            <div>
              <h3>What if it was daytime or cloudy?</h3>
              <p className="muted">The stars were still there. We show them as they’d appear with the Sun and clouds taken away.</p>
            </div>
            <div>
              <h3>What shirt is it?</h3>
              <p className="muted">
                The Bella + Canvas 3001 — a soft, lightweight, retail-fit unisex tee. Your artwork is printed with
                water-based DTG inks that go into the fabric, not on top of it.
              </p>
            </div>
            <div>
              <h3>Shipping &amp; returns</h3>
              <p className="muted">
                Every shirt is made to order and usually leaves the print house in 2–5 days. Because each one is unique we
                can’t take returns for change of mind, but if anything arrives damaged or misprinted we’ll replace it free.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 40 }}>
            <Link className="btn" href="/design">Start designing →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
