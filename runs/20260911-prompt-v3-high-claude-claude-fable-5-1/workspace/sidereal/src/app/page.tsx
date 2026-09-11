import Link from "next/link";
import { ShirtMockup } from "@/components/ShirtMockup";
import { DEFAULT_DESIGN, encodeDesign, type Design } from "@/lib/design";
import { PRICE_CENTS } from "@/lib/catalog";

const EXAMPLES: { design: Design; blurb: string }[] = [
  {
    design: DEFAULT_DESIGN,
    blurb: "An anniversary. The sky over the café where two people first said hello.",
  },
  {
    design: {
      title: "Welcome, June",
      place: "Portland, Oregon",
      lat: 45.5152,
      lon: -122.6784,
      date: "2024-03-02",
      time: "04:12",
      tz: "America/Los_Angeles",
      style: "atlas",
      color: true,
      garment: "natural",
    },
    blurb: "A birth. The exact stars overhead at 4:12 in the morning, constellation names and all.",
  },
  {
    design: {
      title: "Summit day",
      place: "Chamonix, France",
      lat: 45.9237,
      lon: 6.8694,
      date: "2023-08-19",
      time: "23:00",
      tz: "Europe/Paris",
      style: "stars",
      color: false,
      garment: "navy",
    },
    blurb: "A night you don't want to forget. Stars only, one ink, quiet.",
  },
];

export default function Home() {
  const heroSrc = `/api/preview?d=${encodeDesign(DEFAULT_DESIGN)}&png=1&t=1&w=900`;
  const price = (PRICE_CENTS / 100).toFixed(0);
  return (
    <div>
      <section className="starfield relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow mb-4">A shirt for one moment, one place, one person</p>
            <h1 className="font-display text-5xl leading-[1.05] text-star md:text-6xl">
              The sky, exactly as it was <em>above you</em>.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-mist">
              Give us a place, a date and a time. We compute every star that was overhead — thousands of them, in their
              true colours — and print that chart on a shirt. No two are alike, because no two moments are.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/design" className="btn-primary">
                Chart your sky
              </Link>
              <span className="font-mono text-sm text-mist">${price} · printed to order · ships worldwide</span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md">
            <ShirtMockup garment={DEFAULT_DESIGN.garment} src={heroSrc} />
          </div>
        </div>
      </section>

      <section id="how" className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow mb-3">How it works</p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              ["01", "Name the moment", "A first date, a birth, the night you finished the thing. Type the place and pick the date and time."],
              ["02", "We chart the sky", "Using real star positions we render the exact view from that spot at that minute: stars, constellations, cardinal points, your words."],
              ["03", "Printed for one", "Direct-to-garment printing lays down thousands of individually coloured stars on a soft cotton tee. Yours is the only one that exists."],
            ].map(([n, h, p]) => (
              <div key={n} className="rounded-lg border border-line bg-panel p-6">
                <p className="font-mono text-xs text-gold">{n}</p>
                <h3 className="font-display mt-2 text-2xl text-star">{h}</h3>
                <p className="mt-2 text-sm text-mist">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow mb-3">Three moments, three shirts</p>
          <div className="grid gap-8 md:grid-cols-3">
            {EXAMPLES.map(({ design, blurb }) => (
              <Link
                key={design.title}
                href={`/design?d=${encodeDesign(design)}`}
                className="group rounded-lg border border-line bg-panel p-4 transition hover:border-mist"
              >
                <ShirtMockup garment={design.garment} src={`/api/preview?d=${encodeDesign(design)}&png=1&t=1&w=700`} />
                <h3 className="font-display mt-3 text-2xl text-star">{design.title}</h3>
                <p className="font-mono text-xs text-mist">
                  {design.place.toUpperCase()} · {design.date}
                </p>
                <p className="mt-2 text-sm text-mist">{blurb}</p>
                <p className="mt-3 text-xs text-gold opacity-0 transition group-hover:opacity-100">Start from this one →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-5 py-16 md:grid md:grid-cols-2 md:gap-10">
          <div>
            <p className="eyebrow mb-3">Why DTG</p>
            <h2 className="font-display text-3xl text-star">Screen printing needs a hundred of something. We need one.</h2>
          </div>
          <div className="mt-6 space-y-4 text-sm text-mist md:mt-0">
            <p>
              Direct-to-garment printing sprays water-based ink straight into the cotton, pixel by pixel. That means a
              file we render seconds before printing can be as detailed as a poster: thousands of stars, each tinted by
              its real colour temperature, plus your name for the night in a typeface that would smudge under a
              screen.
            </p>
            <p>
              Shirts are Bella + Canvas 3001 unisex tees (100% ring-spun cotton, 4.2 oz) in eight colours. Dark shirts
              get white and colour ink; light shirts get dark ink. Sizes XS to 3XL.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
