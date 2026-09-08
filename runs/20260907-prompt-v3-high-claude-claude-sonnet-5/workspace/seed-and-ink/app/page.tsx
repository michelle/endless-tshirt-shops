import Link from 'next/link';
import { STYLES } from '@/lib/designs';
import { PALETTES } from '@/lib/palettes';

const SHOWCASE = [
  { seed: 'lucky-comet-42', style: 'bloom', palette: 'bloomfield' },
  { seed: 'quiet-harbor-7', style: 'flow', palette: 'deepsea' },
  { seed: 'wild-ember-19', style: 'circuit', palette: 'midnight' },
  { seed: 'electric-tide-3', style: 'nebula', palette: 'sunset' },
] as const;

function designSrc(s: (typeof SHOWCASE)[number]) {
  const params = new URLSearchParams({
    part: 'front',
    seed: s.seed,
    style: s.style,
    palette: s.palette,
    w: '600',
    h: '780',
  });
  return `/api/design-image?${params.toString()}`;
}

export default function HomePage() {
  return (
    <div>
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-seed-400 text-sm tracking-widest uppercase mb-3">
          Direct-to-garment, grown from a phrase
        </p>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">
          One seed. One shirt.
          <br />
          Never printed again.
        </h1>
        <p className="text-neutral-400 mt-5 max-w-xl mx-auto">
          Type a name, a date, an inside joke — anything. We turn it into a
          generative design that exists nowhere else, and print it straight
          onto the fabric with DTG. No two Seed &amp; Ink shirts are alike,
          because no two seeds are.
        </p>
        <Link
          href="/customize"
          className="inline-block mt-8 px-6 py-3 rounded-lg bg-seed-500 hover:bg-seed-400 transition font-medium"
        >
          Grow your shirt
        </Link>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {SHOWCASE.map((s) => (
          <div key={s.seed} className="rounded-xl overflow-hidden bg-ink-900 border border-ink-700/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={designSrc(s)} alt={`${s.style} design`} className="w-full aspect-[600/780] object-cover" />
            <div className="p-2 text-xs text-neutral-500 capitalize">{s.style}</div>
          </div>
        ))}
      </section>

      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-8">
        <div>
          <div className="text-seed-400 text-sm font-medium mb-2">01</div>
          <h3 className="font-display text-xl mb-1">Plant a seed</h3>
          <p className="text-neutral-400 text-sm">
            Type any phrase. It's hashed into a seed that drives the whole
            design — same phrase, same shirt, forever reproducible.
          </p>
        </div>
        <div>
          <div className="text-seed-400 text-sm font-medium mb-2">02</div>
          <h3 className="font-display text-xl mb-1">Pick how it grows</h3>
          <p className="text-neutral-400 text-sm">
            Choose a growth pattern ({STYLES.map((s) => s.name).join(', ')})
            and one of {PALETTES.length} curated palettes, then preview it live
            on the shirt.
          </p>
        </div>
        <div>
          <div className="text-seed-400 text-sm font-medium mb-2">03</div>
          <h3 className="font-display text-xl mb-1">We print &amp; ship</h3>
          <p className="text-neutral-400 text-sm">
            Pay securely with Stripe. Once payment clears, your exact design
            is sent straight to our DTG print partner and shipped to your
            door.
          </p>
        </div>
      </section>
    </div>
  );
}
