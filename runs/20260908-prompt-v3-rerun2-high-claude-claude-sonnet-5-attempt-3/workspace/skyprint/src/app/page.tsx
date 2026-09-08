import Link from "next/link";
import { NavBar, Footer } from "@/components/NavBar";
import { SkyPreview } from "@/components/SkyPreview";

const SAMPLES = [
  {
    dateISO: "2023-06-14T21:30",
    lat: 40.6782,
    lon: -73.9442,
    locationLabel: "Brooklyn, NY, USA",
    caption: "Where it all began",
  },
  {
    dateISO: "2024-12-25T06:10",
    lat: 51.5072,
    lon: -0.1276,
    locationLabel: "London, England",
    caption: "Baby Theo's first sunrise",
  },
  {
    dateISO: "2022-09-03T23:59",
    lat: 35.6762,
    lon: 139.6503,
    locationLabel: "Tokyo, Japan",
    caption: "",
  },
];

export default function Home() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="uppercase tracking-[0.2em] text-xs text-amber-200/80 mb-4">
              Custom DTG-printed apparel
            </p>
            <h1 className="text-4xl sm:text-5xl font-serif font-semibold leading-tight">
              The exact night sky from your date, time &amp; place — printed on a shirt.
            </h1>
            <p className="mt-6 text-white/70 text-lg leading-relaxed">
              Tell us when and where — a first date, a wedding night, the moment your kid was
              born — and we render that real sky, moon phase and all, into a one-of-a-kind
              star map. Nothing is pre-made: every shirt is generated for that exact moment and
              direct-to-garment printed only after you order it.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/design"
                className="rounded-full bg-white text-[#050814] px-6 py-3 font-medium hover:bg-amber-100 transition-colors"
              >
                Design your sky →
              </Link>
              <a href="#how-it-works" className="text-white/70 hover:text-white text-sm">
                How it works
              </a>
            </div>
          </div>
          <div className="aspect-[4/5] w-full max-w-sm mx-auto">
            <SkyPreview input={SAMPLES[0]} />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-6">
            Every one is different
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {SAMPLES.map((s, i) => (
              <div key={i} className="aspect-[4/5]">
                <SkyPreview input={s} />
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="max-w-6xl mx-auto px-6 pb-24">
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-8">How it works</h2>
          <div className="grid sm:grid-cols-4 gap-8 text-white/80">
            <Step n="1" title="Pick a moment">
              A date, time and place that means something. We look up the exact coordinates and
              calculate the real moon phase for that night.
            </Step>
            <Step n="2" title="Preview live">
              Watch your one-of-a-kind star map render instantly, add an optional caption, choose
              shirt style, color and size.
            </Step>
            <Step n="3" title="Pay securely">
              Checkout with Stripe. Nothing gets printed until your payment is confirmed.
            </Step>
            <Step n="4" title="Printed & shipped">
              Your design is sent straight to our direct-to-garment print partner, Prodigi, and
              shipped to your door.
            </Step>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm mb-4">
        {n}
      </div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{children}</p>
    </div>
  );
}
