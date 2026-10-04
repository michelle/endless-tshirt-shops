import { SHIRT_COLORS, SIZES, isColor, isSize } from "@/lib/catalog";
import { DEFAULT_DESIGN, decodeDesign } from "@/lib/design";
import Designer from "./Designer";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const fromUrl = sp.d ? decodeDesign(sp.d) : null;
  const design = fromUrl?.ok ? fromUrl.design : DEFAULT_DESIGN;
  const color = isColor(sp.c) ? sp.c : SHIRT_COLORS[0].id;
  const size = isSize(sp.s) ? sp.s : "l";
  return (
    <main>
      <Designer initialDesign={design} initialColor={color} initialSize={size} canceled={sp.canceled === "1"} />

      <section className="how">
        <h2>How a park gets established</h2>
        <ol>
          <li>
            <strong>Name it.</strong> Your kid, your dog, your grandpa’s garage, the couch. Add the year it was founded
            and a motto for the ring.
          </li>
          <li>
            <strong>We survey the land.</strong> The ridgelines, mesas, coves and tree lines are generated from the
            park’s name — change one letter and the mountains move. Don’t love the terrain? Hit “Re‑survey”.
          </li>
          <li>
            <strong>We print it.</strong> Full-colour direct‑to‑garment print, made to order on a Bella+Canvas 3001 and
            shipped to your door. No two parks alike.
          </li>
        </ol>
      </section>

      <section className="faq">
        <h2>Ranger station</h2>
        <details>
          <summary>What’s the shirt?</summary>
          <p>
            Bella+Canvas 3001 unisex tee — 100% Airlume combed and ring‑spun cotton (heather colours are cotton/poly).
            Retail fit; size up for a roomier feel. Sizes {SIZES[0].toUpperCase()}–{SIZES[SIZES.length - 1].toUpperCase()}.
          </p>
        </details>
        <details>
          <summary>How is it printed?</summary>
          <p>
            Direct‑to‑garment (DTG): water‑based inks sprayed straight into the cotton, so the full landscape — every
            sunset band and pine — prints in colour with a soft hand. The badge is about 11 inches across on the chest.
          </p>
        </details>
        <details>
          <summary>Shipping & timing</summary>
          <p>
            Each shirt is printed on demand at the lab nearest you (US, UK, EU or Australia), usually within 2–4 business
            days, then shipped. Standard shipping is included.
          </p>
        </details>
        <details>
          <summary>Returns</summary>
          <p>
            Because every park is one of a kind, we can’t restock returns — but if your shirt arrives damaged or
            misprinted, email us a photo and we’ll reprint it free.
          </p>
        </details>
      </section>
    </main>
  );
}
