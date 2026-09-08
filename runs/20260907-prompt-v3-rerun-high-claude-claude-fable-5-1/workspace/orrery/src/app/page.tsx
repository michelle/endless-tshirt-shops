import Designer from "@/components/Designer";
import { decodeDesign } from "@/lib/design";
import { SIZES, type Size } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const d = typeof sp.d === "string" ? sp.d : undefined;
  const initial = d ? decodeDesign(d) : undefined;
  const size = SIZES.includes(sp.size as Size) ? (sp.size as Size) : "m";
  const qty = Math.min(5, Math.max(1, Number(sp.qty) || 1));

  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <a href="/" className="mono text-lg tracking-[0.3em]">ORRERY</a>
        <nav className="mono flex gap-6 text-[11px] uppercase tracking-[0.18em] text-mute">
          <a href="#design" className="hover:text-bone">Design</a>
          <a href="#how" className="hover:text-bone">How it works</a>
          <a href="#faq" className="hover:text-bone">FAQ</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-6 pt-10">
        <p className="mono text-[11px] uppercase tracking-[0.25em] text-sun">One date · one shirt · never repeated</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
          Where every planet was<br />on <em className="not-italic text-sky">your</em> day.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-mute">
          Pick a date that matters. We compute the exact position of every planet around the Sun at that moment
          and print the map, with your own words, directly onto the cotton. The planets never line up the same way twice,
          so no two Orrery shirts are ever alike.
        </p>
      </section>

      <Designer initial={initial} initialSize={size} initialQty={qty} />

      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="mono text-[11px] uppercase tracking-[0.25em] text-mute">How it works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ["01 · Compute", "Your date becomes a Julian day. We solve Kepler's equation for each planet using JPL orbital elements to get its heliocentric longitude, the angle it had travelled around the Sun."],
            ["02 · Compose", "The map is drawn as vector art at 300 dpi for the tee's 15.6 × 19.6 inch print area. What you see in the preview is the same file the printer receives, pixel for pixel."],
            ["03 · Print & ship", "Direct-to-garment printing lays water-based ink straight into the cotton: no vinyl, no transfer, full colour, soft hand. Printed to order and shipped from the facility nearest you."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-2xl border border-line bg-dusk/60 p-6">
              <div className="mono text-sm text-sun">{t}</div>
              <p className="mt-3 text-sm leading-relaxed text-mute">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mono text-[11px] uppercase tracking-[0.25em] text-mute">Questions</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {[
            ["Is it really accurate?", "Yes, to within about a degree for dates between 1800 and 2050, and still faithful far beyond that. Orbits are drawn as evenly spaced rings so every planet is legible; positions are the true angle around the Sun at 12:00 UTC on your date."],
            ["What is the shirt?", "Gildan 64000 Softstyle, a unisex 100% ring-spun cotton tee (heathers are cotton blends). Standard fit, crew neck. Sizes XS to 3XL."],
            ["What does it cost to ship?", "Nothing extra. The price includes standard tracked shipping to 37 countries."],
            ["Can I return it?", "Every shirt is made for you, so we can't resell it. If it arrives damaged or misprinted, send a photo within 30 days and we'll reprint it free."],
            ["Which ink colours?", "Dark shirts print in white with a gold Sun; light shirts print in black with a gold Sun. Earth is highlighted in the accent you choose."],
            ["Can I put a longer message on it?", "Captions are up to 30 characters so they stay legible across the chest. The date always prints underneath."],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-medium">{q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-mute">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-mute">
          <span className="mono tracking-[0.2em]">ORRERY TEES</span>
          <span>Positions from JPL approximate planetary elements · Printed by Prodigi · Payments by Stripe</span>
        </div>
      </footer>
    </main>
  );
}
