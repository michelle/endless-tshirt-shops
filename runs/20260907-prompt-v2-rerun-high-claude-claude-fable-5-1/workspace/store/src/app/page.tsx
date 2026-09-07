import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { ShirtMockup } from "@/components/ShirtMockup";
import { BASE_PRICE_CENTS, STORE_TAGLINE, colors, designs, formatMoney } from "@/lib/catalog";

export default function Home() {
  const hero = designs[0];
  const black = colors[0];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Deprecated Parks Service · Official tees</div>
          <h1>
            Visit the places
            <br />
            technology left behind.
          </h1>
          <p className="lead">{STORE_TAGLINE} Eight parks, eight WPA-style posters, one very soft shirt. Printed to order and shipped worldwide.</p>
          <div className="hero-actions">
            <a href="#parks" className="btn primary">
              See the parks · {formatMoney(BASE_PRICE_CENTS)}
            </a>
            <Link href="/about" className="btn ghost">
              Why these parks?
            </Link>
          </div>
        </div>
        <div className="hero-art" style={{ background: hero.paper }}>
          <ShirtMockup slug={hero.slug} color={black} className="hero-shirt" priority />
          <Link href={`/shirts/${hero.slug}`} className="hero-caption">
            {hero.name} · Est. {hero.est}
          </Link>
        </div>
      </section>

      <section id="parks" className="section">
        <div className="section-head">
          <h2>The parks</h2>
          <p className="muted">Every design ships on a Gildan 64000 Softstyle tee in seven colours and sizes XS–3XL.</p>
        </div>
        <div className="grid">
          {designs.map((d, i) => (
            <ProductCard key={d.slug} design={d} index={i} />
          ))}
        </div>
      </section>

      <section className="section how">
        <div className="how-item">
          <h3>Printed to order</h3>
          <p>Each shirt is printed after you order by Prodigi, in the lab nearest to you. No warehouse, no landfill of unsold mediums.</p>
        </div>
        <div className="how-item">
          <h3>Ships worldwide</h3>
          <p>Live shipping rates for 35 countries at checkout. Standard or express, tracked where the carrier allows.</p>
        </div>
        <div className="how-item">
          <h3>Original artwork</h3>
          <p>Every poster is drawn in-house in the style of the 1930s national-park prints, then honours a piece of technology we retired.</p>
        </div>
      </section>
    </>
  );
}
