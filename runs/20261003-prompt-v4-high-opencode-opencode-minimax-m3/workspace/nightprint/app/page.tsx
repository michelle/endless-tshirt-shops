import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SafeSvg } from '@/components/safe-svg';
import { defaultInput, generateSvg, PREVIEW_W, PREVIEW_H } from '@/lib/design';

export default function HomePage() {
  const demoInput = defaultInput();
  const sample1: import('@/lib/design').DesignInput = { ...demoInput, locationName: 'Reykjav\u00EDk, Iceland', headline: 'The Night The Lights Came', message: 'In 2019,\nwe saw the aurora\nfor the first time.', palette: 'ink' };
  const sample2: import('@/lib/design').DesignInput = {
    ...demoInput,
    when: new Date(Date.UTC(2021, 4, 28, 3, 14)),
    locationName: 'New Orleans, USA',
    headline: 'Under This Sky',
    message: 'A first kiss,\nstill fizzing\nin the dark.',
    palette: 'rose',
  };
  const sample3: import('@/lib/design').DesignInput = {
    ...demoInput,
    when: new Date(Date.UTC(1991, 9, 14, 4, 30)),
    locationName: 'Buenos Aires, Argentina',
    headline: 'Born Under',
    message: '',
    palette: 'ivory',
  };

  const sampleSvgs = [
    generateSvg(sample1, { width: PREVIEW_W, height: PREVIEW_H }),
    generateSvg(sample2, { width: PREVIEW_W, height: PREVIEW_H }),
    generateSvg(sample3, { width: PREVIEW_W, height: PREVIEW_H }),
  ];

  return (
    <main>
      <Header />
      <Hero />
      <FeaturedSamples svgs={sampleSvgs.map((s) => s.svg)} />
      <HowItWorks />
      <Product />
      <GiftNote />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg
          viewBox="0 0 1600 800"
          className="absolute inset-0 h-full w-full opacity-90"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="hero-glow" cx="50%" cy="40%" r="35%">
              <stop offset="0%" stopColor="#d4a857" stopOpacity="0.20" />
              <stop offset="50%" stopColor="#d4a857" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0c101a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1600" height="800" fill="url(#hero-glow)" />
          {/* lots of stars */}
          {Array.from({ length: 360 }).map((_, i) => {
            const seed = (i * 9301 + 49297) % 233280;
            const rand = seed / 233280;
            const x = (i * 7919) % 1600;
            const y = ((i * 1789) % 800) - rand * 30;
            const r = rand * 1.1 + 0.3;
            return <circle key={i} cx={x} cy={y} r={r.toFixed(2)} fill="#e8edf5" opacity={0.65 + rand * 0.3} />;
          })}
          {/* a few bright stars with rays */}
          {[
            [720, 220], [440, 360], [1180, 180], [1280, 480], [320, 540],
            [1100, 580], [820, 360], [620, 540], [960, 250],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={4} fill="#fff8d6" />
              <line x1={x - 14} y1={y} x2={x + 14} y2={y} stroke="#fff8d6" strokeWidth="0.6" />
              <line x1={x} y1={y - 14} x2={x} y2={y + 14} stroke="#fff8d6" strokeWidth="0.6" />
            </g>
          ))}
        </svg>
      </div>
      <div className="relative mx-auto max-w-6xl px-6 pt-28 pb-32">
        <p className="label-eyebrow">DTG-printed, on demand, by you.</p>
        <h1 className="mt-4 font-display text-6xl md:text-7xl tracking-tight leading-[1.02] max-w-3xl">
          Wear the sky from{' '}
          <span className="italic text-gold-500">your moment</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-300 leading-relaxed">
          Every STARPRINT shirt is printed from a night sky that belongs to you.
          Choose the date, the place, the words — we print them on a
          heavyweight cotton tee and ship it, frame-ready, anywhere in the world.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/design" className="btn-primary">
            Start your STARPRINT →
          </Link>
          <Link href="#how-it-works" className="btn-ghost">
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturedSamples({ svgs }: { svgs: string[] }) {
  return (
    <section className="relative border-t border-ink-800/80 bg-ink-900/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="font-display text-3xl md:text-4xl">Made for moments</h2>
          <Link href="/design" className="text-sm text-gold-500 hover:text-gold-400">
            Customize your own →
          </Link>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {svgs.map((svg, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border border-ink-700/80 bg-ink-950 shadow-2xl shadow-black/30 ring-1 ring-gold-500/5 hover:ring-gold-500/30 transition-all"
            >
              <div className="aspect-[800/1005]">
                <SafeSvg svg={svg} className="h-full w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Capture your moment',
      body:
        'Pick the date, the place and a short headline. We pull in the moon phase, planet positions, and constellations.',
    },
    {
      step: '02',
      title: 'Preview it on a tee',
      body:
        'Live design tool with multiple palettes and color choices. Each design is rendered at print resolution.',
    },
    {
      step: '03',
      title: 'Pay · we print · we ship',
      body:
        'Stripe checkout takes payment. Then we hand the high-res PNG to Prodigi, who fulfils from the lab nearest to you.',
    },
  ];
  return (
    <section id="how-it-works" className="border-t border-ink-800/80">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="label-eyebrow mb-3">How it works</p>
        <h2 className="font-display text-3xl md:text-4xl max-w-2xl">
          From your moment to a wearable piece.
        </h2>
        <div className="mt-12 grid gap-12 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step}>
              <div className="font-display text-5xl text-gold-500">{s.step}</div>
              <h3 className="mt-3 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-ink-300 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Product() {
  return (
    <section id="story" className="border-t border-ink-800/80 bg-ink-900/30">
      <div className="mx-auto max-w-6xl px-6 py-24 grid gap-12 md:grid-cols-2 items-start">
        <div>
          <p className="label-eyebrow mb-3">Our shirt</p>
          <h2 className="font-display text-3xl md:text-4xl">
            Bella + Canvas 3001, heavyweight cotton, tailored fit.
          </h2>
          <p className="mt-4 text-ink-300 leading-relaxed">
            We print on demand with a single, beautiful blank so your design
            can carry all the attention. Combed ring-spun cotton, side seams
            for shape, a soft drape and DTG-ready fibers for vibrant color.
          </p>
          <ul className="mt-8 space-y-3 text-ink-200">
            <li>• 100% combed ring-spun cotton, 4.2 oz</li>
            <li>• Tailored unisex fit, runs true to size</li>
            <li>• Water-based inks for vibrant print + soft hand feel</li>
            <li>• Fulfilled by Prodigi’s print network ´ ships globally</li>
            <li>• Each shirt is unique ´ no two are ever quite the same</li>
          </ul>
        </div>
        <div className="rounded-xl overflow-hidden border border-ink-700/80 bg-ink-950 ring-1 ring-gold-500/5 p-4">
          <div className="font-display text-xl text-gold-500">Bella + Canvas 3001</div>
          <p className="text-sm text-ink-400 mt-1">$36, printed on demand, worldwide shipping.</p>
          <Link href="/design" className="btn-primary mt-6 w-full">Start your design →</Link>
        </div>
      </div>
    </section>
  );
}

function GiftNote() {
  return (
    <section className="border-t border-ink-800/80">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="label-eyebrow mb-3">A new kind of gift.</p>
        <p className="font-display text-2xl md:text-3xl leading-relaxed">
          A STARPRINT is the gift for the person who has everything ´
          the night you met, the day they were born, the sky above your
          first kiss. <span className="text-gold-500">Durable.</span>{' '}
          <span className="text-gold-500">Personal.</span>{' '}
          <span className="text-gold-500">Wearable.</span>
        </p>
      </div>
    </section>
  );
}
