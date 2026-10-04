import { Designer } from "@/components/Designer";
import { decodeDesign, defaultDesign } from "@/lib/design";
import { SHIRT_PRICE_CENTS } from "@/lib/catalog";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const initial = typeof sp.d === "string" ? decodeDesign(sp.d) : defaultDesign();
  const cancelled = sp.cancelled === "1";
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">
      <header className="flex items-baseline justify-between">
        <div className="text-sm tracking-[0.3em] uppercase">Orbital</div>
        <div className="text-xs text-dim tracking-widest uppercase">Printed to order · ships worldwide</div>
      </header>

      <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div>
          <h1 className="serif text-5xl leading-[1.02] sm:text-6xl">
            Where every planet was
            <br />
            <em className="text-gold">on your day.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-dim">
            Pick a date that matters — a birthday, a wedding, the day you met — and we compute the true heliocentric
            position of all eight planets (nine if you miss Pluto) for that exact day. It becomes a crisp, minimal
            diagram printed directly into the cotton of a soft unisex tee. No two dates look alike.
          </p>
        </div>
        <ul className="grid grid-cols-3 gap-3 text-sm">
          <li className="rounded-lg border border-line bg-panel p-4"><div className="text-gold">${(SHIRT_PRICE_CENTS / 100).toFixed(0)}</div><div className="text-dim">+ shipping</div></li>
          <li className="rounded-lg border border-line bg-panel p-4"><div className="text-gold">DTG</div><div className="text-dim">ink in the fibre, no vinyl</div></li>
          <li className="rounded-lg border border-line bg-panel p-4"><div className="text-gold">1800–2050</div><div className="text-dim">any date, any planet</div></li>
        </ul>
      </section>

      {cancelled && (
        <p className="mt-8 rounded-md border border-line bg-panel px-4 py-3 text-sm text-dim">
          Checkout was cancelled — your design is still here whenever you’re ready.
        </p>
      )}

      <Designer initial={initial} />

      <section className="mt-24 grid gap-8 text-sm text-dim sm:grid-cols-3">
        <div>
          <h3 className="text-paper">The garment</h3>
          <p className="mt-2">Gildan 64000 Softstyle, 100% ring-spun cotton (heathers are blends), unisex fit, XS–5XL. Printed front-only by Prodigi’s DTG labs and shipped from the lab nearest you.</p>
        </div>
        <div>
          <h3 className="text-paper">The science</h3>
          <p className="mt-2">Positions come from JPL’s Keplerian elements for the major planets, accurate to a fraction of a degree between 1800 and 2050. Orbits are drawn evenly spaced so the outer planets fit on a chest.</p>
        </div>
        <div>
          <h3 className="text-paper">Delivery</h3>
          <p className="mt-2">Made within 2–4 working days, then standard (6–12 business days) or express (3–6) shipping. You get a tracking link on your order page as soon as the lab dispatches it.</p>
        </div>
      </section>
    </main>
  );
}
