import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "The Order" };

export default function About() {
  return (
    <div className="wrap narrow prose" style={{ padding: "48px 20px 40px" }}>
      <div className="rule-orn caps">Concerning the Order</div>
      <h1 className="title center" style={{ marginTop: 14 }}>Small disasters deserve saints too.</h1>

      <p>
        The great catastrophes are well covered. Floods have saints. Plagues have saints.
        Nobody has ever been assigned to the person standing in their kitchen at eight in the
        morning, looking at a piece of toast that landed the way toast lands.
      </p>
      <p>
        The Order of Small Disasters exists to correct this. Eight plates, drawn in the manner
        of devotional medallions — the halo, the radiating light, the relic held in both hands —
        and dedicated to catastrophes that ruin twenty minutes and nothing more.
      </p>

      <h2>How the shirts are made</h2>
      <p>
        Each plate is drawn as vector line art and rendered at 300&nbsp;dpi for direct-to-garment
        printing. On dark garments it prints in bone white; on light garments, in ink black.
        The blank is a Gildan 64000 softstyle — 100% ring-spun cotton, a proper t-shirt weight,
        cut unisex.
      </p>
      <p>
        Nothing is printed until you buy it. Your order goes to whichever press in Prodigi&rsquo;s
        network is nearest your address, which is why a shirt bound for Berlin doesn&rsquo;t fly
        from Ohio to get there.
      </p>

      <h2>Sizing</h2>
      <p>
        Unisex and true to size. If you&rsquo;re between sizes, or you like a shirt you can
        disappear into, go up one.
      </p>

      <p className="center" style={{ marginTop: 34 }}>
        <Link className="btn" href="/">See all eight</Link>
      </p>
    </div>
  );
}
