import Link from "next/link";
import { generatePlantSvg } from "@/lib/botanical/generator";
import { CLIMATES, CLIMATE_KEYS } from "@/lib/botanical/palette";
import { Design, toPlantInput } from "@/lib/design";
import { garmentByKey, UNIT_PRICE_CENTS } from "@/lib/catalog";
import { ShirtMockup } from "@/components/ShirtMockup";
import { PlantSvg } from "@/components/PlantSvg";

const SHOWCASE: Design[] = [
  { name: "Elena", date: "1991-05-14", climate: "meadow", dedication: "", variant: 1, garment: "natural" },
  { name: "Theo", date: "2020-11-02", climate: "nocturne", dedication: "For Dad", variant: 1, garment: "black" },
  { name: "Rosa", date: "1968-08-23", climate: "desert", dedication: "", variant: 2, garment: "baby-blue" },
];

export default function Home() {
  const shirts = SHOWCASE.map((d) => {
    const input = toPlantInput(d);
    const { svg, label } = generatePlantSvg(input);
    return { d, svg, label, garment: garmentByKey(d.garment)! };
  });
  const hero = generatePlantSvg(toPlantInput({ name: "Amelia", date: "1994-06-12", climate: "alpine", dedication: "", variant: 1, garment: "white" }));

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-moss">A plant that has never existed before</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
            A one-of-one botanical specimen, grown from your name.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            Give us a name, a date that matters and a climate. We grow a unique plant from those seeds, draw it as a
            vintage herbarium plate with its own Latin binomial, and print it direct-to-garment on a soft cotton tee.
            No two are alike, and yours is never printed for anyone else.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/design" className="btn-primary">
              Grow your specimen
            </Link>
            <span className="text-sm text-ink-soft">${(UNIT_PRICE_CENTS / 100).toFixed(0)} · shipping included worldwide</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md rounded-xl bg-white/60 p-4 shadow-[0_20px_60px_-30px_rgba(43,39,34,0.45)]">
          <PlantSvg svg={hero.svg} />
        </div>
      </section>

      <section className="py-12">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold">Grown for someone. Printed once.</h2>
          <Link href="/design" className="text-sm text-ink-soft underline-offset-4 hover:underline">
            Try your own name
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {shirts.map(({ d, svg, label, garment }) => (
            <div key={d.name} className="text-center">
              <ShirtMockup svg={svg} hex={garment.hex} className="mx-auto w-full max-w-xs" />
              <p className="mt-3 font-display text-2xl italic">
                {label.genus} {label.species}
              </p>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">
                {CLIMATES[d.climate].label} · {garment.label} · No. {label.specimenNo}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="grid gap-8 border-t border-ink/10 py-14 md:grid-cols-3">
        {[
          {
            n: "01",
            t: "Plant the seed",
            b: "Type a name and, if you like, a date: a birthday, an anniversary, the day you met. Choose one of five climates for the palette.",
          },
          {
            n: "02",
            t: "Watch it grow",
            b: "Our generator grows a plant from those inputs alone: stem, leaves, flowers, roots and a Latin name in the style of a 19th-century herbarium plate. Not a template. Not AI-generated. Yours.",
          },
          {
            n: "03",
            t: "Printed for you",
            b: "Because we print direct-to-garment, every shirt can be different. Your plate is rendered at 300 dpi and printed on a Bella+Canvas 3001 tee, then shipped to your door.",
          },
        ].map((s) => (
          <div key={s.n}>
            <p className="font-display text-4xl text-moss">{s.n}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.b}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-ink/10 py-14">
        <h2 className="font-display text-3xl font-semibold">Five climates</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-5">
          {CLIMATE_KEYS.map((k) => (
            <div key={k} className="rounded-xl border border-ink/10 bg-white/50 p-4">
              <div className="flex gap-1">
                {[...CLIMATES[k].palette.leaves.slice(0, 2), ...CLIMATES[k].palette.petals.slice(0, 3)].map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full border border-ink/10" style={{ background: c }} />
                ))}
              </div>
              <p className="mt-3 font-display text-xl font-semibold">{CLIMATES[k].label}</p>
              <p className="text-xs text-ink-soft">{CLIMATES[k].tagline}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
