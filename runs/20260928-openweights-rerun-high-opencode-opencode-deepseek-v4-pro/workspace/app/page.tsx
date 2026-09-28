import Link from 'next/link';
import { encodeDesignParams } from '@/lib/design-params';

const SAMPLES = [
  { title: 'The Night We Met', date: '2019-06-15', place: 'Brooklyn, NY', ink: 'light' as const },
  { title: 'Her First Sunrise', date: '2021-03-08', place: 'Portland, OR', ink: 'dark' as const },
  { title: 'The Day We Said Yes', date: '2023-09-23', place: 'Paris, France', ink: 'light' as const },
];

export default function Home() {
  return (
    <main className="starfield min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl tracking-wide text-cream">Lunaria</span>
          <span className="text-xs uppercase tracking-[0.3em] text-gold">☾</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-cream/70">
          <a href="#how" className="hover:text-cream">How it works</a>
          <Link
            href="/customize"
            className="rounded-full border border-gold/60 px-5 py-2 text-gold transition hover:bg-gold hover:text-night"
          >
            Create yours
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-gold">
          Custom · Printed on demand
        </p>
        <h1 className="text-5xl leading-tight text-cream sm:text-7xl">
          The moon, exactly as it was
          <br />
          <span className="italic text-gold">on your night.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/70">
          Every night has a moon, and no two are alike. Pick the date that
          matters, add your words, and we print the real moon phase from that
          moment onto a soft Bella+Canvas tee — one of a kind, just like the
          night itself.
        </p>
        <div className="mt-10">
          <Link
            href="/customize"
            className="inline-block rounded-full bg-gold px-10 py-4 text-lg font-medium text-night transition hover:bg-cream"
          >
            Design your shirt
          </Link>
        </div>
      </section>

      {/* Samples */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {SAMPLES.map((s) => {
            const d = encodeDesignParams(s);
            return (
              <figure key={s.title} className="text-center">
                <div className="overflow-hidden rounded-2xl border border-cream/10 bg-night">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/design?d=${d}`}
                    alt={`${s.title} — ${s.date}`}
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
                <figcaption className="mt-4">
                  <p className="font-serif text-xl text-cream">{s.title}</p>
                  <p className="text-sm text-cream/50">{s.place}</p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-cream/10 bg-night/40 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-4xl text-cream">How it works</h2>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {[
              {
                n: '01',
                t: 'Choose your night',
                d: 'Pick any date — a birthday, an anniversary, the day you met. We compute the real moon phase for that exact moment.',
              },
              {
                n: '02',
                t: 'Make it yours',
                d: 'Add a title and a place. Pick your shirt colour and size. Watch your design come together in real time.',
              },
              {
                n: '03',
                t: 'We print & ship',
                d: 'Pay securely, and your one-of-a-kind shirt is printed on demand and shipped straight to your door.',
              },
            ].map((s) => (
              <div key={s.n}>
                <p className="font-serif text-3xl text-gold">{s.n}</p>
                <h3 className="mt-2 text-2xl text-cream">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-cream/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-cream/40">
        <p>
          Lunaria · Custom moon-phase tees · Printed on demand with DTG
          technology
        </p>
      </footer>
    </main>
  );
}
