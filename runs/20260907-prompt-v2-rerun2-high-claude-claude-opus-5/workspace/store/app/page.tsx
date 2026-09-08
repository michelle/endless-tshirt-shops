import Link from "next/link";
import Image from "next/image";
import { SAINTS, PRICE_CENTS, money, mockupSrc } from "@/lib/catalog";

export default function Home() {
  return (
    <>
      <section className="wrap hero">
        <div className="rule-orn caps">Eight icons · one liturgy</div>
        <h1>Patron Saints of Small Disasters</h1>
        <p>
          Nobody canonises the person who dropped the toast. We did. Eight hand-drawn
          devotional medallions for the catastrophes that ruin a Tuesday and nothing else —
          printed one at a time on soft cotton and sent wherever you are.
        </p>
      </section>

      <section className="wrap">
        <div className="grid">
          {SAINTS.map((s) => (
            <Link key={s.slug} className="card" href={`/shirt/${s.slug}`}>
              <div className="shot">
                <Image
                  src={mockupSrc(s.slug, "black")}
                  alt={`${s.name} tee, black`}
                  width={1200} height={1200}
                  sizes="(max-width: 700px) 100vw, 280px"
                  priority={s.order <= 4}
                />
              </div>
              <h3>{s.plateName}</h3>
              <div className="ep">{s.epithet}</div>
              <div className="price muted">{money(PRICE_CENTS)}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap narrow center" style={{ padding: "72px 20px 10px" }}>
        <div className="rule-orn caps">The rite of production</div>
        <p className="muted" style={{ marginTop: 18 }}>
          Every shirt is printed after you order it — direct-to-garment on a Gildan 64000
          softstyle, 100% ring-spun cotton — at whichever of Prodigi&rsquo;s presses is closest
          to your door. Nothing is warehoused, nothing is incinerated at the end of the season.
        </p>
      </section>
    </>
  );
}
