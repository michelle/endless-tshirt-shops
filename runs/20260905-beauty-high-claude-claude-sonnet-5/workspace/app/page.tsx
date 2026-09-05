import { ShirtStudio } from '@/components/ShirtStudio';
import { LiveClock } from '@/components/LiveClock';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-32 pt-14 sm:px-10">
      <header className="flex items-center justify-between">
        <a href="/" className="font-display text-xl font-semibold tracking-tight">
          datetime<span className="text-candy-pink">.</span>store
        </a>
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-sm text-white/70 sm:inline-block">
          <LiveClock />
        </span>
      </header>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-candy-pink/30 bg-candy-pink/10 px-4 py-1.5 text-sm font-medium text-candy-pink">
            ⏳ one shirt design, infinite one-of-ones
          </p>
          <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Wear the exact
            <br />
            <span className="bg-gradient-to-r from-candy-pink via-candy-lavender to-candy-gold bg-clip-text text-transparent">
              moment
            </span>{' '}
            you bought it.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            Every datetime.store tee is printed with the precise second you check out — down
            to the millisecond. Pick a mood, freeze your moment, and we'll print &amp; ship a
            shirt that has never existed before and will never exist again.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span>🖨️ Printed on demand by Prodigi</span>
            <span>💳 Checkout secured by Stripe</span>
            <span>🌍 Ships worldwide</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-10 animate-float rounded-full bg-candy-lavender/20 blur-3xl" />
        </div>
      </section>

      <section id="studio" className="mt-20 rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur sm:p-10">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-bold">Build your moment</h2>
          <p className="mt-2 text-white/60">
            This preview is ticking in real time. Nothing is final until you hit checkout.
          </p>
        </div>
        <ShirtStudio />
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        <FeatureCard
          emoji="🎨"
          title="Four moods, infinite moments"
          body="Midnight Terminal, Cotton Candy Sky, Starfield, and Extra Edition — each one renders your timestamp as its own tiny piece of art."
        />
        <FeatureCard
          emoji="🧵"
          title="Printed the moment you commit"
          body="Your exact frozen instant is uploaded only after checkout starts. Nothing is printed until Stripe confirms payment."
        />
        <FeatureCard
          emoji="🚚"
          title="Fulfilled by Prodigi"
          body="Real garments (Gildan Softstyle), DTG-printed and shipped worldwide by Prodigi's on-demand print network."
        />
      </section>

      <footer className="mt-24 border-t border-white/10 pt-8 text-center text-sm text-white/40">
        <p>
          Handcrafted by robots, printed by humans. Time is relative; shipping estimates are not.
        </p>
        <p className="mt-2">datetime.store — a whimsical rebuild, unaffiliated with any actual newspaper.</p>
      </footer>
    </main>
  );
}

function FeatureCard({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{body}</p>
    </div>
  );
}
