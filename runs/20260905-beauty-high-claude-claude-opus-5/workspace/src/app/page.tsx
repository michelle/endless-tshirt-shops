import { Blooms, LiveClock, Ticker } from "@/components/bits";
import { Store } from "@/components/Store";

const TICKER = [
  "one of one",
  "printed on demand",
  "never made twice",
  "free worldwide shipping",
  "the moment you press the button",
  "no restocks, obviously",
];

export default function Home() {
  return (
    <>
      <Blooms />
      <Ticker items={TICKER} />

      <header className="mx-auto flex w-full max-w-[1220px] items-center justify-between px-5 py-5">
        <a href="/" className="group inline-flex items-baseline gap-1.5">
          <span className="font-mono text-[15px] font-bold tracking-tight">datetime</span>
          <span className="blink font-mono text-[15px] font-bold text-flame">.</span>
          <span className="font-mono text-[15px] font-bold tracking-tight">store</span>
        </a>
        <div className="flex items-center gap-5 text-[11px] text-ink-faint">
          <a href="#how" className="stamp hidden text-[10px] hover:text-ink sm:inline">
            how it works
          </a>
          <LiveClock className="text-[11px] tabular-nums" />
        </div>
      </header>

      <main>
        <Store />
        <How />
      </main>

      <Footer />
    </>
  );
}

function How() {
  const steps = [
    {
      n: "01",
      t: "You pick a dialect",
      b: "Epoch milliseconds, ISO 8601, longhand English, Swatch beats, or raw binary. Same instant, five handwritings.",
    },
    {
      n: "02",
      t: "You press the button",
      b: "The clock stops mid-tick. Whatever it read at that exact millisecond is now your shirt, and nobody else can have it.",
    },
    {
      n: "03",
      t: "We draw the print file",
      b: "Letterforms are converted to outlines at 4680 pixels across — no fonts, no rasterised text, nothing to go wrong at the printer.",
    },
    {
      n: "04",
      t: "Prodigi prints and posts it",
      b: "Direct-to-garment onto Bella + Canvas cotton, from the print house closest to you, usually within a couple of days.",
    },
  ];

  return (
    <section id="how" className="border-t border-paper-edge/70 bg-paper-deep/40">
      <div className="mx-auto w-full max-w-[1220px] px-5 py-16">
        <div className="mb-10 max-w-xl">
          <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.02]">
            A shop with one product and <em className="italic text-flame">infinite</em> stock.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Time is the only raw material we have, and there is plenty of it. The awkward part is
            that it keeps moving, so we had to build the whole shop around a single button.
          </p>
        </div>

        <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n}>
              <div className="mb-3 font-mono text-[11px] text-flame">{s.n}</div>
              <h3 className="mb-2 font-display text-xl leading-tight">{s.t}</h3>
              <p className="text-[13.5px] leading-relaxed text-ink-soft">{s.b}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid gap-8 border-t border-paper-edge pt-10 sm:grid-cols-2 lg:grid-cols-3">
          <Faq q="What if I want a moment that already happened?">
            You cannot have it. This is a shop, not a time machine. You may, however, wait for a
            nicer-looking number and press the button then — people do.
          </Faq>
          <Faq q="Is my millisecond really unique?">
            Two people would have to press the same button in the same thousandth of a second. It
            has never happened here. If it does, you both deserve the shirt.
          </Faq>
          <Faq q="How does it fit?">
            Unisex is a Bella + Canvas 3001 — true to size, boxy, soft. Fitted is a 6004 — tapered
            and a touch lighter. Both run honest; take your usual size.
          </Faq>
          <Faq q="Care instructions?">
            Cold wash, inside out, tumble low. The print will outlive the relevance of the number
            printed on it, which is the whole joke.
          </Faq>
          <Faq q="Returns?">
            Anything misprinted, damaged or lost gets remade free. We cannot resell a shirt with
            your millisecond on it, so we do not take change-of-mind returns.
          </Faq>
          <Faq q="Where does it ship from?">
            Prodigi routes each order to the print house nearest you — around fifty countries, free
            standard post, no customs surprises within your own region.
          </Faq>
        </div>
      </div>
    </section>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="stamp mb-2 text-[10px] text-ink">{q}</h3>
      <p className="text-[13.5px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-paper-edge bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-display text-2xl leading-none">datetime.store</div>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-paper/60">
            A t-shirt shop for a single, unrepeatable instant. Rebuilt with love, and with rather
            more of a printing pipeline than last time.
          </p>
        </div>
        <div className="font-mono text-[11px] text-paper/50">
          <div>
            <LiveClock className="text-[11px] text-paper/70" />
          </div>
          <div className="mt-1">payments by stripe · printing by prodigi</div>
        </div>
      </div>
    </footer>
  );
}
