import Link from "next/link";
import { ShirtMockup } from "@/components/ShirtMockup";
import { RingArt } from "@/components/RingArt";
import { parseDesign, renderRings } from "@/lib/rings";
import { findColor, PRICE_CENTS, SHIPPING_CENTS, formatMoney } from "@/lib/catalog";

const EXAMPLES = [
  {
    color: "black",
    who: "Michelle, 39 rings",
    note: "Oak palette. Five moments, from leaving for college to a first marathon.",
    design: {
      name: "Michelle", born: "1988-04-12", palette: "oak", grain: "classic", asOf: "2026-09-10",
      milestones: [
        { year: 2006, label: "Left for college" }, { year: 2011, label: "Met Sam" }, { year: 2015, label: "Moved to Portland" },
        { year: 2019, label: "Juniper was born" }, { year: 2023, label: "First marathon" },
      ],
    },
  },
  {
    color: "sand",
    who: "Grandpa Joe, 82 rings",
    note: "Moss palette, fine grain. A retirement gift with the grandkids' birth years marked.",
    design: {
      name: "Joe", born: "1944-06-02", palette: "moss", grain: "fine", asOf: "2026-09-10", caption: "Eighty-two rings and counting",
      milestones: [
        { year: 1966, label: "Married Ruth" }, { year: 1970, label: "Opened the shop" }, { year: 1998, label: "First grandchild" },
        { year: 2009, label: "Retired, finally" },
      ],
    },
  },
  {
    color: "navy blue",
    who: "Priya, 5 rings",
    note: "Aurora palette. A kid's whole life so far, every ring a different colour.",
    design: {
      name: "Priya", born: "2021-02-14", palette: "aurora", grain: "bold", asOf: "2026-09-10",
      milestones: [{ year: 2023, label: "First steps" }, { year: 2025, label: "Started school" }],
    },
  },
] as const;

export default function Home() {
  const examples = EXAMPLES.map((e) => {
    const design = parseDesign(e.design);
    const color = findColor(e.color)!;
    const art = renderRings(design, { onDark: color.dark, nested: { x: 165, y: 150, width: 270, height: 252 }, id: `ex-${e.color.replace(/\s/g, "")}` }).svg;
    return { ...e, color, art };
  });
  const hero = examples[0];
  const heroFlat = renderRings(parseDesign(hero.design), { onDark: true, id: "hero" }).svg;

  return (
    <main>
      <section className="wrap hero">
        <div>
          <div className="eyebrow">One shirt. One life. Never printed twice.</div>
          <h1>Your years, drawn as rings.</h1>
          <p className="lede">
            A tree records every year it lives as a ring. So do you. Heartwood turns your birthday and the moments that shaped you into a one-of-a-kind ring pattern, printed in full colour on a soft cotton tee, just for you.
          </p>
          <div className="cta">
            <Link href="/design" className="btn accent big">
              Grow your rings
            </Link>
            <a href="#how" className="btn ghost">
              How it works
            </a>
          </div>
          <p className="fine">
            {formatMoney(PRICE_CENTS)} per shirt · {formatMoney(SHIPPING_CENTS)} shipping worldwide · printed to order in 2–5 business days
          </p>
        </div>
        <div className="hero-art">
          <RingArt svg={heroFlat} style={{ background: "#1b1b1d", borderRadius: 24, padding: 20, boxShadow: "var(--shadow)" }} />
          <div className="caption">{hero.who} · generated from a birthday and five moments</div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2>Three minutes from birthday to blueprint.</h2>
          <div className="steps">
            <div className="step">
              <div className="num">1</div>
              <h3>Tell us your years</h3>
              <p>Your birthday sets the ring count. Add up to six moments, a wedding, a move, a kid, a comeback, and each one becomes a coloured ring with its year and a label.</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>Watch it grow</h3>
              <p>Rings are generated live from what you type: wider in the fast-growing early years, wobbling like real wood. Pick a palette, a grain, a shirt colour. No two are the same.</p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>We print it once</h3>
              <p>Pay securely, and only then does the print-ready file go to the lab. Direct-to-garment printing lays every colour straight into the cotton. Then it ships to your door.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="examples">
        <div className="wrap">
          <div className="eyebrow">Made for one person each</div>
          <h2>Some rings we&apos;ve grown.</h2>
          <div className="gallery">
            {examples.map((e) => (
              <figure key={e.color.key}>
                <ShirtMockup color={e.color} artSvg={e.art} id={`g-${e.color.key.replace(/\s/g, "")}`} />
                <figcaption>
                  <b>{e.who}.</b> {e.note}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="details">
        <div className="wrap specs">
          <div>
            <div className="eyebrow">The shirt</div>
            <h2>Soft cotton, sharp print.</h2>
            <p style={{ color: "var(--ink-2)" }}>
              Every Heartwood tee is printed direct-to-garment, which means full colour, fine detail, and a print that&apos;s part of the fabric rather than sitting on top of it. It softens with washing and never cracks like a transfer.
            </p>
            <Link href="/design" className="btn">
              Start designing
            </Link>
          </div>
          <ul>
            <li><span>Blank</span><span>Gildan 64000 Softstyle, unisex, 100% ring-spun cotton</span></li>
            <li><span>Sizes</span><span>XS – 3XL, true to size</span></li>
            <li><span>Colours</span><span>Black, White, Navy, Sport Grey, Dark Heather, Forest, Maroon, Sand</span></li>
            <li><span>Print</span><span>DTG, 11&quot; wide chest print, 300 dpi</span></li>
            <li><span>Price</span><span>{formatMoney(PRICE_CENTS)} + {formatMoney(SHIPPING_CENTS)} shipping, anywhere we ship</span></li>
            <li><span>Timing</span><span>2–5 business days to print, then 3–10 days in transit</span></li>
            <li><span>Care</span><span>Wash cold inside out, tumble low or hang dry</span></li>
          </ul>
        </div>
      </section>

      <section className="section faq" id="faq">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="eyebrow">Questions</div>
          <h2>Good to know.</h2>
          <details>
            <summary>Is it really unique?</summary>
            <p>Yes. The ring pattern is computed from your name, birthday, palette and grain, and the moments you add. Change a letter and the wood changes. We generate the print file at the moment you pay and it&apos;s only ever used for your order.</p>
          </details>
          <details>
            <summary>Can I make one for someone else?</summary>
            <p>Most people do. Put their name and birthday in, add the moments you shared, and ship it straight to them. The birth-year caption is automatic, or write your own.</p>
          </details>
          <details>
            <summary>What if I don&apos;t know the exact date?</summary>
            <p>Only the year really matters for the ring count. Pick any day in the right year.</p>
          </details>
          <details>
            <summary>Returns?</summary>
            <p>Each shirt is generated and printed for one person, so we can&apos;t restock it. If it arrives damaged or misprinted, we replace it free. If you picked the wrong size, get in touch and we&apos;ll sort something out.</p>
          </details>
          <details>
            <summary>Where do you ship?</summary>
            <p>US, Canada, UK, EU, Australia, New Zealand, Japan, Singapore and more, from the print lab closest to you. Shipping is a flat rate at checkout.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
