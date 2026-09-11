import Link from "next/link";
import { Foot, Nav } from "@/components/Chrome";
import { Tee } from "@/components/Tee";
import { SAMPLES } from "@/lib/samples";
import { artToken } from "@/lib/art";
import { renderFront } from "@/lib/render";
import { GARMENTS } from "@/lib/spec";
import { BASE_CENTS, money } from "@/lib/pricing";

export const dynamic = "force-static";

/** The hero is inlined so it paints with the HTML; the rest load as cached art. */
function SampleTee({ id, inline = false }: { id: string; inline?: boolean }) {
  const sample = SAMPLES.find((s) => s.id === id)!;
  const src = "/api/art/" + artToken(sample.spec, "front") + ".svg";
  return (
    <Tee color={GARMENTS[sample.spec.garment].hex}>
      {inline ? (
        <div dangerouslySetInnerHTML={{ __html: renderFront(sample.spec) }} />
      ) : (
        <img src={src} alt={sample.spec.title} loading="lazy" />
      )}
    </Tee>
  );
}

export default function Home() {
  return (
    <>
      <Nav />

      <main className="wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">One of one &middot; printed to order</p>
            <h1>
              Your life is a<br />
              network. Wear<br />
              the map.
            </h1>
            <p className="lede" style={{ marginTop: 22 }}>
              Interchange turns the stops of your life into a proper transit map &mdash; coloured
              lines, interchange rings, 45&deg; corners, the lot &mdash; and prints it edge to edge
              on a heavyweight cotton tee. Your map has never existed before and will never be
              printed again.
            </p>
            <div className="cta">
              <Link className="btn accent" href="/design">Design your map</Link>
              <Link className="btn ghost" href="#how">How it works</Link>
            </div>
            <p className="muted" style={{ marginTop: 18 }}>
              {money(BASE_CENTS)} &middot; Gildan 64000 Softstyle &middot; ships worldwide
            </p>
          </div>
          <div className="hero-tee">
            <SampleTee id="rosa" inline />
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Twenty minutes of remembering. One shirt nobody else owns.</h2>
          </div>
          <div className="grid-3 steps">
            <div className="card step">
              <h3>Name your lines</h3>
              <p>
                Childhood. Work. Love. Bad decisions. Each line is a thread through your life, and
                you pick its colour.
              </p>
            </div>
            <div className="card step">
              <h3>Add your stops</h3>
              <p>
                Places, people, years, jokes. Put the same stop on two lines and the map draws a
                real interchange ring where they meet &mdash; because that is what actually happened.
              </p>
            </div>
            <div className="card step">
              <h3>We print exactly that</h3>
              <p>
                The layout engine draws your map at 300 DPI and sends it straight to a direct-to-garment
                press. No minimums, no screens, no two the same.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <p className="eyebrow">Real output from the engine</p>
            <h2>Every one of these was generated from a handful of typed-in stops.</h2>
          </div>
          <div className="gallery">
            {SAMPLES.slice(0, 3).map((s) => (
              <figure key={s.id}>
                <SampleTee id={s.id} />
                <figcaption>
                  <b>{s.name}</b>
                  {s.blurb}
                </figcaption>
              </figure>
            ))}
          </div>
          <div style={{ marginTop: 34 }}>
            <Link className="btn" href="/design">Start from one of these</Link>
          </div>
        </section>

        <section className="section">
          <div className="grid-2">
            <div>
              <p className="eyebrow">Why it can exist</p>
              <h2>Screen printing could never do this.</h2>
              <p>
                A screen print needs a screen per colour, per design, and a minimum run to pay for
                it. A four-line map with your stops on it would cost hundreds to set up and you would
                have to buy fifty of them.
              </p>
              <p>
                Direct-to-garment printing lays ink straight onto the cotton from a file, so a run of
                one costs the same per shirt as a run of a thousand. That is the entire reason
                Interchange is possible: the artwork is generated the moment you pay, and the press
                has never seen it before.
              </p>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>The shirt</h3>
              <table className="summary">
                <tbody>
                  <tr><td>Garment</td><td>Gildan 64000 Softstyle</td></tr>
                  <tr><td>Fabric</td><td>100% ringspun cotton, 150 gsm</td></tr>
                  <tr><td>Fit</td><td>Unisex, XS&ndash;3XL</td></tr>
                  <tr><td>Print</td><td>Direct to garment, 300 DPI</td></tr>
                  <tr><td>Print area</td><td>15.6&Prime; &times; 19.3&Prime; front</td></tr>
                  <tr><td>Colours</td><td>{Object.keys(GARMENTS).length} garment colours</td></tr>
                  <tr><td>Back print</td><td>Optional service index</td></tr>
                  <tr className="total"><td>Price</td><td>{money(BASE_CENTS)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section faq" id="faq">
          <div className="section-head">
            <p className="eyebrow">FAQ</p>
            <h2>The sensible questions.</h2>
          </div>
          <details open>
            <summary>How does the map decide where things go?</summary>
            <p>
              A layout engine, not a person. It routes each line octilinearly (only horizontal,
              vertical and 45&deg; segments, like every transit map you have ever read), snaps your
              stops onto straight track away from corners, and solves label placement so nothing
              collides. Put the same stop name on two lines and those two routes are forced to meet
              at one point, drawn as an interchange ring.
            </p>
          </details>
          <details>
            <summary>Will it look like the preview?</summary>
            <p>
              Yes &mdash; the preview and the print file come out of the same renderer on the same
              server. The only difference is resolution: the preview is vector, the press gets a
              4680 &times; 5790 pixel PNG with a transparent background.
            </p>
          </details>
          <details>
            <summary>How long does it take?</summary>
            <p>
              Printing takes 2&ndash;4 working days, then standard delivery is another 4&ndash;7 days
              (1&ndash;3 on express). You get a tracking link on your order page as soon as the print
              partner dispatches it.
            </p>
          </details>
          <details>
            <summary>Can I change it after ordering?</summary>
            <p>
              Message us straight away and we will try, but custom prints move to the press quickly.
              Once a shirt is printed it cannot be resold to anyone else, so personalised orders are
              not returnable unless the item is faulty or misprinted &mdash; in which case we reprint
              it free.
            </p>
          </details>
          <details>
            <summary>Where does it ship from?</summary>
            <p>
              Whichever print partner is closest to you. Orders are produced in the UK, the EU, the
              US and Australia, so most shirts cross one border at most.
            </p>
          </details>
        </section>

        <section className="section" style={{ textAlign: "center" }}>
          <h2>What would your lines be called?</h2>
          <p className="lede" style={{ margin: "0 auto 26px" }}>
            You already know two of them.
          </p>
          <Link className="btn accent" href="/design">Design your map</Link>
        </section>
      </main>

      <Foot />
    </>
  );
}
