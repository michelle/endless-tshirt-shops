import Link from 'next/link';
import Tee from '@/components/Tee';
import { DESIGNS, PRICE_CENTS, money } from '@/lib/catalog';

const DEFAULT_COLOR: Record<string, string> = {
  'knocker-upper': 'navy blue',
  lamplighter: 'black',
  'switchboard-operator': 'sand',
  'ice-cutter': 'forest green',
  'human-computer': 'maroon',
  'log-driver': 'black',
};

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="eyebrow">Six trades · Six crests · One shift left</div>
          <h1>
            Apparel for jobs<br />that <em>no longer exist</em>.
          </h1>
          <p>
            Somebody used to walk your street before dawn and tap on your window so you would not be
            late. Somebody connected every phone call on earth by hand. The work is gone; the badge
            should not be. Six union-style crests for six extinct trades.
          </p>
          <div className="hero-cta">
            <Link href="#shirts" className="btn btn-solid">See the register</Link>
            <Link href="/about" className="btn btn-ghost">Why these six</Link>
          </div>
        </div>
      </section>

      <div className="strip">
        <div className="wrap strip-in">
          <span>Printed on demand</span>
          <span>Free worldwide shipping</span>
          <span>Heavyweight ringspun cotton</span>
          <span>{money(PRICE_CENTS)}</span>
        </div>
      </div>

      <section className="section" id="shirts">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">The Register of Vanished Work</div>
              <h2>Six trades that clocked out for good</h2>
            </div>
            <p>
              Every crest carries the years the trade was worked and the motto it earned. Two inks,
              printed direct to garment in the size you choose.
            </p>
          </div>

          <div className="grid">
            {DESIGNS.map((d) => (
              <Link key={d.slug} href={`/shirt/${d.slug}`} className="card">
                <div className="card-media">
                  <Tee slug={d.slug} colorId={DEFAULT_COLOR[d.slug] ?? 'black'} />
                </div>
                <div className="card-body">
                  <div>
                    <div className="card-title">{d.trade}</div>
                    <div className="card-motto">“{d.motto}”</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="card-price">{money(PRICE_CENTS)}</div>
                    <div className="card-meta">{d.years}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="story">
        <div className="wrap">
          <div className="eyebrow">The idea</div>
          <h2>Every job here was somebody’s whole life.</h2>
          <p>
            These were not hobbies. They were trades with apprenticeships, unions, seniority lists and
            funerals. Then a machine arrived and the whole craft went quiet inside a generation.
            Last Shift makes the badge that trade never got to retire with.
          </p>
          <div className="cols">
            <div>
              <div className="eyebrow">01 — The garment</div>
              <h4>Gildan 64000 Softstyle</h4>
              <p>Unisex, 100% ringspun cotton, side-seamed, tear-away label. XS through 3XL.</p>
            </div>
            <div>
              <div className="eyebrow">02 — The print</div>
              <h4>Direct to garment, two inks</h4>
              <p>
                A 12-inch front print at 300 dpi. Cream ink on dark cloth, ink black on light —
                each crest is drawn twice so it never looks washed out.
              </p>
            </div>
            <div>
              <div className="eyebrow">03 — The making</div>
              <h4>Printed after you order</h4>
              <p>
                Nothing sits in a warehouse. Your shirt is printed and dispatched from the nearest of
                a global network of print works, usually within two to four working days.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
