import Link from "next/link";
import Image from "next/image";

interface SampleDesign {
  headline: string;
  subtitle: string;
  date: string;
  place: string;
  palette: "ink" | "ivory" | "sage";
}

const samples: SampleDesign[] = [
  {
    headline: "The Night We Met",
    subtitle: "Elena & Marco",
    date: "Jun 14 2019 · 23:30 UTC",
    place: "Lisbon, Portugal",
    palette: "ink",
  },
  {
    headline: "The Night Leo Was Born",
    subtitle: "Our Greatest Adventure",
    date: "Sep 02 2023 · 04:12 UTC",
    place: "Porto, Portugal",
    palette: "ink",
  },
  {
    headline: "First Light",
    subtitle: "Wren & Sage",
    date: "May 27 2018 · 06:02 UTC",
    place: "Kyoto, Japan",
    palette: "sage",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-24 bg-stars">
        <div className="container-narrow relative z-10 text-center">
          <p className="pill mb-8">A direct-to-garment, one-of-one print</p>
          <h1 className="h-display text-5xl md:text-7xl text-parchment mb-6">
            The sky above the moment
            <br />
            <span className="text-gold italic">that matters to&nbsp;you</span>.
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-parchment/80 italic mb-12">
            Every Under This Sky shirt is generated in-store from the
            actual position of the stars, the moon and the planets at the
            date and place you choose — then printed on-demand and shipped
            worldwide by Prodigi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/design" className="btn-primary">
              Design your shirt →
            </Link>
            <Link href="#how-it-works" className="btn-ghost">
              How it works
            </Link>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-inkDeep pointer-events-none" />
      </section>

      {/* Samples */}
      <section className="py-24">
        <div className="container-narrow">
          <p className="label-display text-gold text-sm text-center mb-3">
            Some shirts customers have made
          </p>
          <h2 className="h-display text-3xl md:text-5xl text-center text-parchment mb-12">
            Three real prints from real moments.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {samples.map((sample) => (
              <PreviewTile key={sample.headline} sample={sample} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-24 border-t border-gold/15 bg-ink/40"
      >
        <div className="container-narrow">
          <p className="label-display text-gold text-sm mb-3 text-center">
            How it works
          </p>
          <h2 className="h-display text-3xl md:text-5xl text-center text-parchment mb-16">
            From a memory to a shirt in three steps.
          </h2>
          <ol className="grid md:grid-cols-3 gap-12">
            {[
              {
                n: "01",
                title: "Tell us about the moment",
                body: "Pick a date, time and place. Add a headline (‘The Night We Met’) and an optional short message.",
              },
              {
                n: "02",
                title: "We compose the sky",
                body: "We compute the stars, moon phase, sun and visible planets at that moment — and overlay them with your personal text.",
              },
              {
                n: "03",
                title: "We print it on a real shirt",
                body: "Stripe collects payment. The design is sent to Prodigi as a DTG print on a Gildan 64000 t-shirt and shipped to your address worldwide.",
              },
            ].map((step) => (
              <li key={step.n} className="text-center">
                <span className="block label-display text-4xl text-gold mb-3">
                  {step.n}
                </span>
                <h3 className="h-display text-2xl text-parchment mb-3">
                  {step.title}
                </h3>
                <p className="text-parchment/75 italic">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The shirt */}
      <section className="py-24">
        <div className="container-narrow grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="label-display text-gold text-sm mb-3">
              The garment
            </p>
            <h2 className="h-display text-3xl md:text-4xl text-parchment mb-4">
              Gildan 64000 — soft, semi-fitted, 100% ring-spun cotton.
            </h2>
            <p className="text-parchment/80 italic mb-6">
              A crew-neck classic printed with water-based DTG inks in a
              global Prodigi lab closest to you. Plastic-free packaging. Fast
              production, white-label shipped.
            </p>
            <ul className="space-y-2 text-parchment/80">
              <li>• <strong>Sizes:</strong> XS – 3XL (unisex)</li>
              <li>• <strong>Colors:</strong> Satin Black, Optic White, Deep Navy, Natural, Sand, Military Green</li>
              <li>• <strong>Print:</strong> Front, full colour, 4665×5844 px</li>
              <li>• <strong>Lead time:</strong> 3–5 business days production</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-ink/30 border border-gold/30 p-6 text-center">
            <p className="label-display text-gold text-xs mb-4">
              Example render
            </p>
            <div className="aspect-square bg-midnight rounded-xl flex items-center justify-center border border-gold/20 p-6">
              <p className="h-display text-3xl text-parchment italic leading-snug">
                “<span className="text-gold">The Night We Met</span>”
                <br />
                <span className="text-sm not-italic tracking-widest text-parchment/70">
                  Jun 14 2019 · 23:30 UTC
                </span>
                <br />
                <span className="text-sm not-italic tracking-widest text-parchment/70">
                  Lisbon, Portugal
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-32 pt-8 text-center">
        <Link href="/design" className="btn-primary text-lg">
          Make your own →
        </Link>
      </section>
    </main>
  );
}

function PreviewTile({ sample }: { sample: SampleDesign }) {
  const bg =
    sample.palette === "ink"
      ? "linear-gradient(160deg, #0a1830 0%, #1d2952 100%)"
      : sample.palette === "sage"
      ? "linear-gradient(160deg, #dfe3c8 0%, #3a5942 100%)"
      : "linear-gradient(160deg, #f4ecd8 0%, #cbb98d 100%)";
  const text = sample.palette === "ink" ? "#f4ecd8" : "#1c2a18";
  const sub = sample.palette === "ink" ? "#d9b67a" : "#5d4423";
  return (
    <div className="rounded-xl border border-gold/30 overflow-hidden bg-ink/30 group">
      <div className="aspect-[3/4] flex items-center justify-center" style={{ background: bg }}>
        <div className="text-center px-6">
          <p className="text-2xl md:text-3xl italic" style={{ color: text, fontFamily: "var(--font-serif)" }}>
            {sample.headline}
          </p>
          <p className="text-xs uppercase tracking-widest mt-3" style={{ color: sub }}>
            {sample.subtitle}
          </p>
          <p className="text-[10px] uppercase tracking-widest mt-2" style={{ color: sub }}>
            {sample.date}
          </p>
          <p className="text-sm uppercase tracking-widest mt-1" style={{ color: text }}>
            {sample.place}
          </p>
        </div>
      </div>
      <div className="p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-parchment/60">
          One of one — never produced again
        </p>
      </div>
    </div>
  );
}
