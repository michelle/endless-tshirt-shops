import { Summoner } from "@/components/Summoner";
import { TeeMockup } from "@/components/TeeMockup";
import { normalizeSpec, CryptidSpec } from "@/lib/spec";
import { generateCryptid } from "@/lib/genome";
import { renderPlate, plateSvg } from "@/lib/art/plate";
import { COLORS, formatUsd, BASE_PRICE_CENTS } from "@/lib/catalog";

const HERO_SPEC: Partial<CryptidSpec> = {
  keeper: "June",
  place: "Portland, OR",
  hour: 3,
  appetite: "unread group chats",
  temperament: "feral",
  twist: 1,
};

const SPECIMENS: Partial<CryptidSpec>[] = [
  { keeper: "Tomas", place: "Kraków", hour: 22, appetite: "single socks", temperament: "mischievous", twist: 0 },
  { keeper: "Ingrid", place: "Reykjavik", hour: 5, appetite: "expired coupons", temperament: "vengeful", twist: 0 },
  { keeper: "Yusuf", place: "Istanbul", hour: 3, appetite: "half-finished novels", temperament: "melancholic", twist: 0 },
  { keeper: "Dee", place: "New Orleans", hour: 0, appetite: "borrowed umbrellas", temperament: "feral", twist: 2 },
];

export default function Home() {
  const heroSpec = normalizeSpec(HERO_SPEC);
  const hero = generateCryptid(heroSpec);
  const heroColor = COLORS.find((c) => c.id === "black")!;
  const heroPlate = renderPlate(hero, heroColor.ink, "hero");

  const specimens = SPECIMENS.map((s, i) => {
    const spec = normalizeSpec(s);
    const c = generateCryptid(spec);
    const ink = i % 2 === 0 ? "bone" : "coal";
    const bg = ink === "bone" ? "#1a1a1c" : "#eae1cd";
    const svg = plateSvg(c, ink, `sp${i}`).replace(
      /(<svg[^>]*>)/,
      `$1<rect width="1200" height="1600" fill="${bg}"/>`
    );
    return { c, svg };
  });

  return (
    <main>
      <section className="wrap hero">
        <div>
          <p className="eyebrow">Field guides to the unseen</p>
          <h1 className="display">
            Everyone is haunted
            <br />
            by <em>something.</em>
            <br />
            We draw yours.
          </h1>
          <p className="lede">
            Answer five questions about the thing that follows you around. We render it as a
            nineteenth-century naturalist&apos;s plate — Latin name, field notes, danger rating,
            your name in the credits — and print it, once, on a heavyweight tee.
          </p>
          <div className="hero-cta">
            <a className="btn lg" href="#summon">
              Summon your cryptid
            </a>
            <a className="btn ghost lg" href="#specimens">
              See specimens
            </a>
          </div>
          <ul className="trust">
            <li>{formatUsd(BASE_PRICE_CENTS)} · free worldwide shipping</li>
            <li>One-of-one artwork</li>
            <li>Direct-to-garment, printed to order</li>
          </ul>
        </div>
        <div>
          <div className="tee-frame">
            <TeeMockup
              garmentHex={heroColor.hex}
              plate={heroPlate}
              label={`${hero.commonName} printed on a black t-shirt`}
            />
          </div>
          <div className="stage-meta">
            <span>{hero.commonName}</span>
            <span>Plate no. {hero.plateNo}</span>
          </div>
        </div>
      </section>

      <section className="wrap" id="summon" style={{ paddingTop: 42 }}>
        <div className="section-head">
          <h2>The summoning</h2>
          <p className="eyebrow">Five questions · live preview · nobody else gets this one</p>
        </div>
        <Summoner />
      </section>

      <section className="wrap" id="how" style={{ paddingTop: 42 }}>
        <div className="section-head">
          <h2>How it works</h2>
          <p className="eyebrow">No two plates are the same</p>
        </div>
        <div className="cols3">
          <div className="card">
            <span className="num">01</span>
            <h3>You answer five questions</h3>
            <p>
              Your name, the place it haunts, the hour it stirs, what it eats, and how it behaves.
              Every answer changes the drawing — anatomy, palette, markings, the lot.
            </p>
          </div>
          <div className="card">
            <span className="num">02</span>
            <h3>We draw the specimen</h3>
            <p>
              A generative illustrator builds the creature from your answers and sets it into a full
              field-guide plate: binomial name, sighting notes, height against a human, danger pips.
            </p>
          </div>
          <div className="card">
            <span className="num">03</span>
            <h3>It is printed once</h3>
            <p>
              Direct-to-garment printing means full colour at a run of exactly one. Your file goes to
              the press only after your payment clears, then ships from the nearest lab.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap" id="specimens" style={{ paddingTop: 58 }}>
        <div className="section-head">
          <h2>Recent specimens</h2>
          <p className="eyebrow">Documented by their keepers</p>
        </div>
        <div className="gallery">
          {specimens.map(({ c, svg }, i) => (
            <article className="plate-card" key={i}>
              <div className="art" dangerouslySetInnerHTML={{ __html: svg }} />
              <div className="cap">
                {c.commonName} · {c.spec.place}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap" id="faq" style={{ paddingTop: 58 }}>
        <div className="section-head">
          <h2>Questions</h2>
          <p className="eyebrow">Reasonable ones</p>
        </div>
        <div className="faq">
          <div>
            <h3>Is it really unique?</h3>
            <p>
              The drawing is generated from your exact answers, so two people would need identical
              names, towns, hours, diets and temperaments to land on the same creature. Change one
              character and the anatomy changes.
            </p>
          </div>
          <div>
            <h3>What am I actually getting?</h3>
            <p>
              A Bella + Canvas 3001 unisex tee, 100% ringspun cotton, with a roughly 12 × 16 inch
              full-colour plate printed direct-to-garment on the front.
            </p>
          </div>
          <div>
            <h3>How long does it take?</h3>
            <p>
              Printing takes two to four working days, then standard tracked delivery. Every shirt is
              made after you order it — there is no shelf to pull it off.
            </p>
          </div>
          <div>
            <h3>Can I change my mind?</h3>
            <p>
              Because each shirt is made only for you, we can only cancel before it enters
              production. Misprints and damaged goods are replaced, no argument.
            </p>
          </div>
          <div>
            <h3>Why does the ink colour change?</h3>
            <p>
              On dark garments the plate is drawn in bone; on cream and white it flips to coal. It is
              the same drawing, inked so it stays legible on the fabric you chose.
            </p>
          </div>
          <div>
            <h3>Where do you ship?</h3>
            <p>
              108 countries. Shipping is already in the price, and your shirt is printed at whichever
              lab is closest to you.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
