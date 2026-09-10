import Link from 'next/link';
import { buildSpecimen } from '@/lib/species';
import { shirtSvg } from '@/lib/draw/shirt';
import { plateSvg } from '@/lib/draw/plate';
import { COLOR_BY_ID } from '@/lib/catalog';
import { encodeDesign, formatMoney } from '@/lib/design';
import { SIZES } from '@/lib/catalog';

const HERO = { n: 'Ada Lovelace', d: '1815-12-10', p: 'London', pal: 'cyanotype', col: 'natural', sz: 'm', q: 1 };

const SHOWCASE = [
  { n: 'Yusuf Adeyemi', d: '1994-06-23', p: 'Lagos', pal: 'coral', col: 'black', sz: 'l', q: 1 },
  { n: 'Marta Rossi', d: '1978-03-04', p: 'Bologna', pal: 'foxglove', col: 'sand', sz: 's', q: 1 },
  { n: 'Kenji Watanabe', d: '2001-09-17', p: 'Sapporo', pal: 'nocturne', col: 'forest green', sz: 'm', q: 1 },
];

function plateFor(d: typeof HERO) {
  const specimen = buildSpecimen({ name: d.n, date: d.d, place: d.p, paletteId: d.pal });
  const colour = COLOR_BY_ID[d.col];
  return {
    specimen,
    token: encodeDesign(d),
    plate: plateSvg(specimen, { dark: colour.dark, garmentHex: colour.hex }),
    shirt: shirtSvg(specimen, colour.hex, colour.dark),
  };
}

export default function Home() {
  const hero = plateFor(HERO);
  const showcase = SHOWCASE.map(plateFor);
  const basePrice = SIZES[0].priceCents;

  return (
    <>
      <section className="wrap hero">
        <div>
          <p className="mono hero-eyebrow">Edition of one · printed to order</p>
          <h1>
            Every person is a <em>species</em>.
          </h1>
          <p className="hero-lede">
            Give us a name, a date and a place. We draw the plant that only those three things could
            produce — habit, leaf, flower, root, Latin binomial, typed specimen label — and press
            that single plate onto a shirt. Nobody else has your plant. Nobody else can.
          </p>
          <div className="btn-row">
            <Link className="btn" href="/design">
              Collect your specimen
            </Link>
            <Link className="btn btn-ghost" href={`/design?d=${encodeURIComponent(hero.token)}`}>
              See Ada&apos;s
            </Link>
          </div>
          <p className="btn-note" style={{ marginTop: 18 }}>
            {formatMoney(basePrice)} · free preview · nothing printed until you order
          </p>
        </div>
        <div className="plate-card" dangerouslySetInnerHTML={{ __html: hero.shirt }} />
      </section>

      <section className="wrap section" id="how">
        <div className="section-head">
          <h2>Direct-to-garment means we never print the same shirt twice.</h2>
          <p>
            Screen printing needs a run of two hundred identical shirts to make sense. A DTG press
            doesn&apos;t care — it inks whatever file it is handed, one garment at a time. So instead
            of picking a design off a rack, you grow one.
          </p>
        </div>
        <div className="steps">
          <div className="step">
            <p className="step-no">01</p>
            <h3>Three answers</h3>
            <p>
              A name, a date, a place. That&apos;s the whole seed. Everything below is derived from
              it and nothing is random — type the same three things tomorrow and the identical plant
              grows back.
            </p>
          </div>
          <div className="step">
            <p className="step-no">02</p>
            <h3>The plant grows</h3>
            <p>
              Five growth habits, nine leaf outlines, six margins, six flower forms, six
              inflorescences, five root systems and eight ink palettes, plus continuous traits like
              branch angle and petal count. Millions of plates, one of them yours.
            </p>
          </div>
          <div className="step">
            <p className="step-no">03</p>
            <h3>It gets named</h3>
            <p>
              Your first name is Latinised into a genus, your month sets the species epithet, your
              surname signs the plate as collector. The typed label records the locality and date you
              gave us.
            </p>
          </div>
          <div className="step">
            <p className="step-no">04</p>
            <h3>Pressed once</h3>
            <p>
              We render your plate at 300 dpi across the full print area and send it to a press near
              you. It is inked onto ring-spun cotton and posted. Then the file is only ever yours.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap section" id="gallery">
        <div className="section-head">
          <h2>Four people, four plants.</h2>
          <p>
            None of these were drawn by hand and none of them were drawn twice. Each is the only
            possible output for the name, date and place beneath it.
          </p>
        </div>
        <div className="gallery">
          {[hero, ...showcase].map((item, i) => {
            const d = [HERO, ...SHOWCASE][i];
            return (
              <figure key={item.specimen.taxon.accession}>
                <Link href={`/design?d=${encodeURIComponent(item.token)}`} style={{ textDecoration: 'none' }}>
                  <div className="plate-card" dangerouslySetInnerHTML={{ __html: item.plate }} />
                </Link>
                <figcaption>
                  <em>
                    {item.specimen.taxon.genus} {item.specimen.taxon.epithet}
                  </em>{' '}
                  — “{item.specimen.taxon.common}”
                  <br />
                  {d.n} · {item.specimen.taxon.dateLong} · {d.p}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>The practical bits.</h2>
        </div>
        <div className="faq">
          <div>
            <h3>What am I actually buying?</h3>
            <p>
              A Gildan 64000 unisex softstyle tee, 100% ring-spun cotton, in XS–3XL and ten colours.
              The plate is printed direct-to-garment across a 12″ × 16″ area on the chest.
            </p>
          </div>
          <div>
            <h3>Will it look like the preview?</h3>
            <p>
              The preview and the print file come out of the same drawing code, so yes. You can open
              the exact file we send to the press from the studio before you pay.
            </p>
          </div>
          <div>
            <h3>Dark shirts?</h3>
            <p>
              Every palette has a second, lighter ink set. Pick a dark garment and the plate switches
              to it automatically — no white box behind the artwork.
            </p>
          </div>
          <div>
            <h3>How long does it take?</h3>
            <p>
              Two to four working days at the press, then however long the post takes. Delivery is
              quoted live from the facility nearest you before you pay, never estimated afterwards.
            </p>
          </div>
          <div>
            <h3>Can I change my mind?</h3>
            <p>
              Until you pay, yes — nothing is sent to the press before the payment clears. After
              that it is a one-off print made specifically for you, so we can only replace it if it
              arrives faulty or wrong.
            </p>
          </div>
          <div>
            <h3>Can I put someone else&apos;s name on it?</h3>
            <p>
              That is rather the point. A specimen plate of a person is a much better present than a
              mug, and the label already has a space for who collected it.
            </p>
          </div>
        </div>
        <div className="btn-row">
          <Link className="btn" href="/design">
            Start with a name
          </Link>
        </div>
      </section>
    </>
  );
}
