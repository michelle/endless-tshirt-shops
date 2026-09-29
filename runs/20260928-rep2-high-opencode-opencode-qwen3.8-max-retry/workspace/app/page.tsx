import Link from 'next/link';
import { Studio } from '../components/studio';

export const metadata = {
  alternates: { canonical: '/' },
};

/** Deterministic decorative stars for the hero (baked at build time). */
function heroStars(seed: number) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${(rng() * 100).toFixed(2)}%`,
    top: `${(rng() * 100).toFixed(2)}%`,
    size: 1 + Math.round(rng() * 2),
    delay: `${(rng() * 4).toFixed(2)}s`,
    opacity: 0.3 + rng() * 0.7,
  }));
}

const STEPS = [
  {
    n: '01',
    title: 'Choose your night',
    body: 'A date and a place that mean something — a first kiss, a birth, a wedding night, the night you finally left. Add a few words if you want them.',
  },
  {
    n: '02',
    title: 'We compose your sky',
    body: 'The moon is rendered in its true phase for that exact night. The stars, the constellation and the shooting star are seeded from your moment — a sky that exists once, for you.',
  },
  {
    n: '03',
    title: 'Printed one of one',
    body: 'Your poster is printed direct-to-garment on a premium Bella+Canvas 3001 — water-based ink, full-colour, edge-to-edge — and shipped from the lab nearest you.',
  },
];

const FAQS = [
  {
    q: 'Is the moon accurate?',
    a: 'Yes — the phase and illumination are computed from the lunar cycle for the date you choose, so a full moon on your night is a full moon on your shirt. The starfield is generative art seeded from your date and place: it is your sky in spirit, composed once, not a star chart.',
  },
  {
    q: 'What is direct-to-garment printing?',
    a: 'DTG is essentially a precision inkjet for fabric: water-based inks printed straight into the cotton, with no screens and no setup costs. It is the only way to print a different full-colour artwork on every single shirt — which is exactly what a one-of-one store needs.',
  },
  {
    q: 'What does the shirt fit like?',
    a: 'The Bella+Canvas 3001 is a unisex tailored fit in 100% combed, ring-spun cotton (XS–4XL). Most people take their usual size; size up for an oversized look.',
  },
  {
    q: 'How long does it take?',
    a: 'Every shirt is made to order: production takes 3–5 days, then standard shipping runs 5–12 business days depending on where you are. We print at the lab closest to your address.',
  },
  {
    q: 'Can I return it?',
    a: 'Because every shirt is printed just for you, we cannot resell returns — but if a print arrives faulty or damaged we will reprint or refund it immediately. Just email us a photo.',
  },
  {
    q: 'How do I care for the print?',
    a: 'Wash cold, inside-out, with similar colours. No bleach, no fabric softener. Tumble dry low or hang to dry, and iron inside-out only — never on the print.',
  },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  return (
    <Shell>
      {cancelled ? (
        <div className="border-b border-night-700 bg-night-900/80 py-3 text-center text-sm text-mist-300">
          Checkout cancelled — nothing was charged. Your sky is still waiting below.
        </div>
      ) : null}
      <Hero />
      <main>
        <section id="studio" className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <div className="mb-10 text-center">
            <h2 className="font-display text-4xl text-mist-100 sm:text-5xl">Design your night</h2>
            <p className="mx-auto mt-3 max-w-xl text-mist-300">
              Everything updates live — the moon, the stars, the shirt. When it looks like your night, check out.
            </p>
          </div>
          <Studio />
        </section>

        <section id="how" className="border-t border-night-800 bg-night-900/40 py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="text-center font-display text-4xl sm:text-5xl">How it works</h2>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl border border-night-700 bg-night-950/60 p-8">
                  <div className="font-display text-5xl text-aurora/70">{s.n}</div>
                  <h3 className="mt-4 text-xl font-semibold text-mist-100">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mist-300">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-aurora">Why direct-to-garment</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">No screens. No minimums. No two alike.</h2>
            <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-mist-300">
              Screen printing charges for setup, so it only makes sense to print the same design a hundred times.
              DTG changed the maths: every shirt can carry its own full-colour artwork at no extra cost.
              That is the whole reason Moonworn can exist — a store where the inventory is your memories,
              and every order is the only one of its kind we will ever print.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm text-mist-500">
              <span>✦ Water-based inks</span>
              <span>✦ 100% combed cotton</span>
              <span>✦ Printed near you, shipped to you</span>
              <span>✦ One of one, numbered</span>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-night-800 bg-night-900/40 py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="text-center font-display text-4xl sm:text-5xl">Questions</h2>
            <div className="mt-12 space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-night-700 bg-night-950/60 p-6 open:border-night-600">
                  <summary className="cursor-pointer list-none text-base font-semibold text-mist-100 marker:content-none">
                    <span className="mr-3 text-aurora">+</span>
                    {f.q}
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-mist-300">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="relative z-20 border-b border-night-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" className="font-display text-2xl tracking-wide text-mist-100">
            MOON<span className="text-moonlight">WORN</span>
          </a>
          <nav className="flex items-center gap-6 text-sm text-mist-300">
            <a href="#how" className="hidden hover:text-mist-100 sm:block">How it works</a>
            <a href="#faq" className="hidden hover:text-mist-100 sm:block">FAQ</a>
            <Link href="/track" className="hover:text-mist-100">Track an order</Link>
            <a href="#studio" className="rounded-full bg-moonlight px-4 py-2 font-semibold text-night-950 hover:bg-white">
              Design yours
            </a>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

function Hero() {
  const stars = heroStars(20260928);
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {stars.map((s) => (
          <span
            key={s.id}
            className="star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: s.delay,
            }}
          />
        ))}
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-aurora/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-4xl px-5 pb-20 pt-24 text-center sm:px-8 sm:pt-32">
        <p className="text-xs font-medium uppercase tracking-[0.34em] text-aurora">Personalised night-sky tees · one of one</p>
        <h1 className="mt-6 font-display text-5xl leading-[1.05] text-mist-100 sm:text-7xl">
          Wear the night that<br />changed <span className="italic text-moonlight">everything</span>.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-mist-300">
          One date. One place. One sky that was yours alone. We render the moon in its true phase
          for your night, compose a starfield seeded from your moment, and print it — once —
          on a premium tee with direct-to-garment ink.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a href="#studio" className="rounded-full bg-moonlight px-8 py-4 font-semibold text-night-950 transition hover:bg-white">
            Design your night
          </a>
          <a href="#how" className="rounded-full border border-night-600 px-8 py-4 text-mist-100 transition hover:border-mist-500">
            How it works
          </a>
        </div>
        <p className="mt-6 text-xs text-mist-500">Made to order · ships worldwide · from $34</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-night-800 py-12">
      <div className="mx-auto max-w-6xl px-5 text-center text-xs leading-relaxed text-mist-500 sm:px-8">
        <p className="font-display text-lg tracking-wide text-mist-300">MOONWORN</p>
        <p className="mt-2">The night you love, worn. Printed on demand with our fulfilment partner Prodigi · payments by Stripe.</p>
        <p className="mt-4 text-mist-500/70">
          Demo storefront: payments run in Stripe test mode and orders are placed with Prodigi&apos;s sandbox, so no real shirts are printed or shipped.
        </p>
      </div>
    </footer>
  );
}
