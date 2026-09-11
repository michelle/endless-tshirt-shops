import Link from "next/link";
import { UNIT_PRICE_CENTS } from "@/lib/product";

const SAMPLES = [
  { title: "Maya & Jonah", date: "June 14 2019", subtitle: "New York, NY", palette: "midnight" },
  { title: "The Whitfields", date: "Est. 2024", subtitle: "", palette: "nebula" },
  { title: "Elena", date: "March 3 2003", subtitle: "Born under these stars", palette: "emerald" },
] as const;

function sampleSrc(s: (typeof SAMPLES)[number]) {
  const params = new URLSearchParams({ title: s.title, date: s.date, subtitle: s.subtitle, palette: s.palette, format: "svg" });
  return `/api/artwork?${params.toString()}`;
}

export default function Home() {
  const price = (UNIT_PRICE_CENTS / 100).toFixed(2);
  return (
    <div>
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-10 text-center">
        <p className="uppercase tracking-[0.3em] text-xs text-white/50 mb-4">One shirt. One sky. Yours alone.</p>
        <h1 className="font-serif text-4xl sm:text-5xl leading-tight">Wear your story in the stars.</h1>
        <p className="mt-5 text-white/70 max-w-2xl mx-auto">
          Give us two names, a word, a date &mdash; whatever marks the moment &mdash; and we generate a
          one-of-a-kind constellation just for you. Every shirt is printed direct-to-garment, on demand,
          after you place your order. No two are ever the same.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/design" className="rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/85 transition">
            Design yours &mdash; ${price}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10 grid sm:grid-cols-3 gap-6">
        {SAMPLES.map((s) => (
          <div key={s.title} className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sampleSrc(s)} alt={`Sample constellation design: ${s.title}`} className="w-full aspect-[4/5] object-cover" />
          </div>
        ))}
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-serif text-2xl text-center mb-10">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="text-white/40 text-xs mb-2">01</div>
            <h3 className="font-medium mb-1">Tell us what to chart</h3>
            <p className="text-white/60">
              Two names, an anniversary, a birth date, a place &mdash; anything meaningful. We turn it into a
              unique star field and connect it into your own constellation.
            </p>
          </div>
          <div>
            <div className="text-white/40 text-xs mb-2">02</div>
            <h3 className="font-medium mb-1">Preview it live, pick your shirt</h3>
            <p className="text-white/60">
              Watch the design generate in real time as you type. Choose a palette, garment color, and size.
            </p>
          </div>
          <div>
            <div className="text-white/40 text-xs mb-2">03</div>
            <h3 className="font-medium mb-1">We print &amp; ship after payment</h3>
            <p className="text-white/60">
              Once your payment is confirmed, your design is sent straight to our direct-to-garment production
              partner and printed to order &mdash; nothing is pre-made or kept in stock.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
