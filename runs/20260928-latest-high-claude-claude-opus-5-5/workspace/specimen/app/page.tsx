import { EXAMPLES } from "@/lib/examples";
import { encodeDesignParam, epithetFor } from "@/lib/design";
import { mockupSvg } from "@/lib/mockup";
import { SIZES, SHIPPING_OPTIONS, formatUsd } from "@/lib/catalog";

function Tee({ i }: { i: number }) {
  const { design } = EXAMPLES[i];
  return <div dangerouslySetInnerHTML={{ __html: mockupSvg(design, { uid: `ex${i}` }) }} />;
}

export default function Home() {
  const from = formatUsd(SIZES[0].priceCents);
  return (
    <main>
      <section className="hero">
        <div className="wrap">
          <div>
            <div className="label">Plate No. 001 · A field guide to rare species</div>
            <h1>
              You are a <em>rare species</em>. Wear the proof.
            </h1>
            <p className="lede">
              Describe a person you love (or yourself, or a truly excellent dog) and we&apos;ll discover a brand-new moth,
              butterfly or beetle in their honor: Latin name, field notes, conservation status and all. It&apos;s printed
              full-color, straight onto the shirt.
            </p>
            <div className="hero-meta">
              <a className="btn" href="/design">
                Describe your specimen →
              </a>
              <span>
                {from} · 1 of 1 · ships worldwide
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="tee">
              <Tee i={1} />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="label">Method</div>
          <h2>How a new species is described</h2>
          <p className="sub">
            Direct-to-garment printing means there are no screens and no minimums, so every shirt can be completely
            different. We use that: no two SPECIMEN tees are the same.
          </p>
          <div className="steps">
            <div className="step">
              <div className="n">I. OBSERVE</div>
              <h3>Tell us about them</h3>
              <p>Name, natural habitat, diet, their signature call, and three distinguishing marks only you would know.</p>
            </div>
            <div className="step">
              <div className="n">II. CLASSIFY</div>
              <h3>A species is generated</h3>
              <p>
                We grow a unique creature with its own wing shapes, eyespots and markings, and give it a properly
                Latinised name. Don&apos;t love it? Mutate it until you do.
              </p>
            </div>
            <div className="step">
              <div className="n">III. PRESERVE</div>
              <h3>Printed just for them</h3>
              <p>
                Your plate is printed full-bleed on a soft Bella+Canvas tee by our print lab, then shipped to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="gallery">
        <div className="wrap">
          <div className="label">Recently catalogued</div>
          <h2>From the collection</h2>
          <p className="sub">Tap any specimen to start from it and make it your own.</p>
          <div className="gallery">
            {EXAMPLES.map(({ design, who }, i) => (
              <a key={i} href={`/design?from=${encodeDesignParam(design)}`}>
                <Tee i={i} />
                <div className="cap">
                  <i>
                    {design.genus} {epithetFor(design.genus, design.trait)}
                  </i>
                  <span>{who}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap specs">
          <div>
            <div className="label">Specifications</div>
            <h2>The shirt</h2>
            <dl>
              <dt>Garment</dt>
              <dd>Bella+Canvas 3001 unisex tee, 100% combed ring-spun cotton</dd>
              <dt>Print</dt>
              <dd>Full-color direct-to-garment, up to ~12″ × 15″ on the chest</dd>
              <dt>Colors</dt>
              <dd>White, Natural, Athletic Heather, Black, Navy, Military Green, Maroon</dd>
              <dt>Sizes</dt>
              <dd>
                XS–XL {formatUsd(SIZES[0].priceCents)} · 2XL–3XL {formatUsd(SIZES[6].priceCents)}
              </dd>
              <dt>Shipping</dt>
              <dd>
                {SHIPPING_OPTIONS.map((o) => `${o.label} ${formatUsd(o.amountCents)} (${o.minDays}–${o.maxDays} business days)`).join(" · ")}. Printed
                to order, usually within 2–4 business days.
              </dd>
            </dl>
          </div>
          <div className="faq" id="faq">
            <div className="label">Field questions</div>
            <h2>FAQ</h2>
            <details>
              <summary>Is every shirt really unique?</summary>
              <p>
                Yes. Each creature is generated from a random seed plus your choices, and the plate carries your
                words. The specimen number on the plate is derived from the whole design.
              </p>
            </details>
            <details>
              <summary>Can I make one for my pet / partner / coworker?</summary>
              <p>Absolutely. Pets are our most-described species. Just use their name.</p>
            </details>
            <details>
              <summary>What does the preview show?</summary>
              <p>
                The preview is drawn with the exact code that makes the print file, so what you see is what the printer
                receives. Colors on fabric are a little softer than on screen.
              </p>
            </details>
            <details>
              <summary>Returns?</summary>
              <p>
                Because every shirt is made for one person, we can&apos;t take returns for size or change of mind. If
                anything arrives misprinted or damaged, we&apos;ll reprint it free.
              </p>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
