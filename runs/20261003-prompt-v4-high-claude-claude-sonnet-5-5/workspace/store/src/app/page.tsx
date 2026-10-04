import Link from "next/link";
import { PRESETS } from "@/lib/presets";
import { designToParam } from "@/lib/design";

const mock = (p: (typeof PRESETS)[number], w = 700) => `/api/mockup?fmt=png&bg=1&w=${w}&d=${designToParam(p.design)}`;

export default function Home() {
  const hero = PRESETS[0];
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Made-to-order · printed one at a time</div>
          <h1>Wear the sky from the night that mattered.</h1>
          <p className="lead">
            Pick a date and a place. We calculate the real sky from that exact moment (every star, planet and the Moon) and print it on a
            soft cotton tee. Nobody else has yours.
          </p>
          <div className="cta">
            <Link href="/design" className="btn">Design your tee · $36</Link>
            <a href="#examples" className="btn ghost">See examples</a>
          </div>
        </div>
        <div className="shirt">
          <img src={`/api/mockup?fmt=png&w=900&d=${designToParam(hero.design)}`} alt={`Black t-shirt printed with the night sky over Napa on October 14, 2023`} width={900} height={900} />
        </div>
      </section>

      <section className="block" id="how">
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2>One moment. One sky. One shirt.</h2>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Choose the moment</h3><p className="muted">The night you met, a birth, a wedding, a finish line. Enter the date, the time if you know it, and the place.</p></div>
            <div className="step"><div className="n">2</div><h3>We map the real sky</h3><p className="muted">Positions of 1,600+ stars, constellations, the planets, the Sun and the Moon&rsquo;s exact phase, computed for that place and instant.</p></div>
            <div className="step"><div className="n">3</div><h3>It&rsquo;s printed &amp; shipped</h3><p className="muted">Your design is printed directly onto the shirt and mailed to you in about 5&ndash;10 business days. No two are the same.</p></div>
          </div>
        </div>
      </section>

      <section className="block" id="examples">
        <div className="wrap">
          <div className="eyebrow">Moments, worn</div>
          <h2>Start from one of these, or make your own.</h2>
          <div className="gallery">
            {PRESETS.map((p) => (
              <div className="card" key={p.slug}>
                <img src={mock(p)} alt={`${p.name}: ${p.design.place.name}, ${p.design.date}`} loading="lazy" width={700} height={700} />
                <div className="body">
                  <h3>{p.name}</h3>
                  <p>{p.blurb}</p>
                  <Link className="more" href={`/design?d=${designToParam(p.design)}`}>Make it yours →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap two">
          <div>
            <div className="eyebrow">The shirt</div>
            <h2>Soft, light, and built to be worn a lot.</h2>
            <ul className="ticks">
              <li>Bella + Canvas 3001 unisex tee: 100% combed ring-spun cotton (heathers are blends)</li>
              <li>Printed directly into the fabric (DTG), so there&rsquo;s no stiff, cracking vinyl layer</li>
              <li>Six colours, with ink colours matched to each so the design always has contrast</li>
              <li>Sizes S to 3XL. Cold wash, inside out, for the longest life</li>
            </ul>
          </div>
          <div>
            <div className="eyebrow">Questions</div>
            <details><summary>Is the sky really accurate?</summary><p>Yes. We use astronomical algorithms for sidereal time, precession, and the positions of the Sun, Moon and planets, then project the sky above your exact coordinates. The stars shown reach about magnitude 5, a little fainter than you can see from a suburb.</p></details>
            <details><summary>I don&rsquo;t know the exact time.</summary><p>Tick &ldquo;I don&rsquo;t know the time.&rdquo; We&rsquo;ll show the sky at 9 pm and leave the time off the shirt.</p></details>
            <details><summary>Can&rsquo;t find my town?</summary><p>We search about 70,000 places worldwide. If yours isn&rsquo;t listed, pick the nearest larger town; the sky barely changes within 30 km.</p></details>
            <details><summary>Can I return it?</summary><p>Every shirt is made just for you, so we can&rsquo;t take back change-of-mind returns, but if it arrives damaged or misprinted we&rsquo;ll replace it. See <Link href="/shipping-returns">shipping &amp; returns</Link>.</p></details>
          </div>
        </div>
      </section>

      <section className="block" style={{ textAlign: "center" }}>
        <div className="wrap">
          <h2>What was above you?</h2>
          <p className="muted">It takes about a minute. You&rsquo;ll see your shirt before you pay.</p>
          <Link href="/design" className="btn">Design your tee</Link>
        </div>
      </section>
    </>
  );
}
