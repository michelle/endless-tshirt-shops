import Link from 'next/link';
import { PRESET_PLACES } from '@/lib/places';

const FEATURED_LABELS = [
  'WHERE WE MET',
  'SAID I DO',
  'HOME',
  'BUILT HERE',
  'ROOTS',
  'A STORY BEGINS',
];

export default function HomePage() {
  return (
    <div className="bg-bone">
      {/* HERO */}
      <section className="paper">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-7 flex flex-col justify-center">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-rust">Custom coordinates tees</span>
            <h1 className="font-serif text-5xl md:text-7xl mt-3 leading-[0.95] tracking-tight">
              Wear the place <em className="not-italic underline decoration-rust decoration-2 underline-offset-8">only you understand.</em>
            </h1>
            <p className="mt-6 text-lg text-ink/80 max-w-xl">
              A tee designed by you —{' '}
              <span className="font-mono">label, coordinates, year</span> — and
              printed on demand with direct-to-garment. One shirt, one story,
              made only for you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/design" className="bg-ink text-bone px-6 py-3 rounded-full font-medium hover:bg-rust transition-colors">
                Design yours
              </Link>
              <Link href="#how" className="border border-ink/20 px-6 py-3 rounded-full hover:border-ink/60">
                How it works
              </Link>
            </div>
            <div className="mt-10 text-xs font-mono uppercase tracking-widest text-ink/60">
              Made-to-order · Ships worldwide · 30-day guarantee
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="relative aspect-[5/6] rounded-2xl overflow-hidden border border-ink/10 bg-white shadow-2xl">
              <div className="absolute inset-0 grid-bg" />
              {/* Hero mock shirt card */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-ink text-bone w-[88%] aspect-[5/6] rounded-2xl shadow-xl flex flex-col items-center justify-between p-8 relative overflow-hidden">
                  <div className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-widest opacity-70">N</div>
                  <div className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest opacity-70">001</div>
                  <div className="w-full text-center mt-6">
                    <div className="font-serif text-2xl tracking-tight">WHERE WE MET</div>
                    <div className="font-mono text-xs uppercase tracking-widest opacity-70 mt-1">Paris, France</div>
                  </div>
                  <div className="flex-1 w-full flex flex-col items-center justify-center">
                    <div className="font-mono text-2xl">48° 51′ 24″ N</div>
                    <div className="font-mono text-2xl">2° 21′ 08″ E</div>
                  </div>
                  <div className="w-full text-center">
                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Est. 2018 · —K &amp; J</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-ink/10 bg-sand py-4 overflow-hidden">
        <div className="flex whitespace-nowrap marquee-track gap-12 will-change-transform">
          {[...FEATURED_LABELS, ...FEATURED_LABELS].map((l, i) => (
            <span key={i} className="font-serif text-3xl text-ink/60 flex items-center gap-12">
              {l} <span className="font-mono text-base">·</span>
            </span>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-rust">01</div>
            <h3 className="font-serif text-3xl mt-2">Made only for you.</h3>
            <p className="text-ink/70 mt-3">Every shirt starts blank. You set the place, the label, the year, the personal name on the back.</p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-rust">02</div>
            <h3 className="font-serif text-3xl mt-2">DTG — full color, full bleed.</h3>
            <p className="text-ink/70 mt-3">Direct-to-garment printing means tiny text, gradients, and our fine-typographic maps come out sharp. No minimums.</p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-rust">03</div>
            <h3 className="font-serif text-3xl mt-2">Print when you order.</h3>
            <p className="text-ink/70 mt-3">Powered by Prodigi. Your shirt is printed the moment you check out, then ships to your door from the nearest lab.</p>
          </div>
        </div>
      </section>

      {/* PLACES */}
      <section className="bg-ink text-bone">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-bone/60">Pick a place to start</div>
              <h2 className="font-serif text-4xl mt-1">Somewhere you've been. Or somewhere you're going.</h2>
            </div>
            <Link href="/design" className="hidden md:inline-flex bg-bone text-ink px-4 py-2 rounded-full text-sm hover:bg-rust hover:text-bone">
              Start from scratch →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PRESET_PLACES.map((p) => (
              <Link
                key={p.id}
                href={{ pathname: '/design', query: { lat: p.lat, lng: p.lng, city: `${p.city}, ${p.country}` } }}
                className="border border-bone/10 rounded-xl p-5 hover:bg-bone/5 transition"
              >
                <div className="text-3xl">{p.glyph}</div>
                <div className="mt-3 font-serif text-xl">{p.city}</div>
                <div className="text-xs font-mono text-bone/60">{p.country}</div>
                <div className="mt-2 font-mono text-[11px] text-bone/50">
                  {p.lat.toFixed(2)}° / {p.lng.toFixed(2)}°
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-serif text-5xl tracking-tight">Your place, on a shirt.</h2>
        <p className="mt-4 text-ink/70">$34.99 · Ships in 3–5 business days from the nearest Prodigi lab.</p>
        <Link href="/design" className="inline-block mt-8 bg-rust text-bone px-8 py-4 rounded-full text-lg hover:bg-ink transition">
          Start designing →
        </Link>
      </section>
    </div>
  );
}
