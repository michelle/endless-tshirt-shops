import Link from "next/link";
import { DESIGNS } from "@/lib/designs";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(190,255,60,0.12),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-24 text-center">
          <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-1 text-xs font-semibold tracking-wide text-lime-300">
            NOW HIRING: THE UNDEAD SHIFT
          </span>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            Cryptids have to pay rent too.
          </h1>
          <p className="max-w-xl text-lg text-zinc-400">
            Six legendary creatures, six thankless night jobs. Soft unisex
            tees, screen-print-style badge art, printed and shipped on demand
            &mdash; nobody has to sit on inventory, least of all Bigfoot.
          </p>
          <div className="flex gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-lime-300 px-6 py-3 font-bold text-black transition hover:bg-lime-200"
            >
              Shop the collection
            </Link>
            <Link
              href="#story"
              className="rounded-full border border-white/20 px-6 py-3 font-bold text-white transition hover:border-white/40"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-black tracking-tight text-white">
            The Night Shift
          </h2>
          <Link href="/shop" className="text-sm font-medium text-lime-300 hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {DESIGNS.map((d) => (
            <ProductCard key={d.slug} design={d} />
          ))}
        </div>
      </section>

      <section id="story" className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Every legend needs a paycheck.
            </h2>
            <p className="mt-4 text-zinc-400">
              We got tired of cryptids being mysterious and unemployed, so we
              gave them jobs. Bigfoot pulls espresso shots. Mothman guards
              your parking garage. Nessie keeps the office wifi alive out of
              spite. It&apos;s a whole economy down there in the woods / loch
              / server closet.
            </p>
            <p className="mt-4 text-zinc-400">
              Each design starts as original badge art, drawn in-house, then
              gets printed straight onto a soft 100% cotton unisex tee &mdash;
              made only when you order it, so nothing sits in a warehouse
              waiting to go out of style.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {DESIGNS.slice(0, 6).map((d) => (
              <div
                key={d.slug}
                className="flex items-center justify-center rounded-xl p-3"
                style={{ backgroundColor: d.ink }}
              >
                <img
                  src={`/art/${d.slug}-preview.png`}
                  alt={d.name}
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
