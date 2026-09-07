import Link from "next/link";
import { DESIGNS, PRICE_CENTS, formatMoney } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-8 py-12 sm:grid-cols-5 sm:py-20">
        <div className="sm:col-span-3">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-rust">Apparel for trades the world forgot</div>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] sm:text-6xl">
            Union tees for jobs that no longer exist.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/80">
            Lamplighters. Knocker-uppers. Human computers. Every shirt is a guild badge for a profession that electricity, automation or the alarm clock retired.
            Wear it for the workers who were the infrastructure.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#shirts" className="btn">Browse the ten locals</Link>
            <Link href="/about" className="btn-outline">Why a guild?</Link>
          </div>
          <div className="mt-6 font-mono text-xs uppercase tracking-widest text-ink/60">
            {formatMoney(PRICE_CENTS)} each · Bella + Canvas 3001 · printed to order · ships worldwide
          </div>
        </div>
        <div className="sm:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/designs/human-computers-dark.png" alt="Society of Human Computers badge" className="mx-auto w-full max-w-sm" />
        </div>
      </section>

      <section id="shirts" className="scroll-mt-24 py-8">
        <div className="flex items-end justify-between border-b border-ink/20 pb-3">
          <h2 className="font-display text-2xl sm:text-3xl">The locals</h2>
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60">{DESIGNS.length} designs · 8 colours · XS–4XL</div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {DESIGNS.map((d, i) => (
            <ProductCard key={d.slug} design={d} index={i} />
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-6 rounded-lg border border-ink/15 bg-paper-2/60 p-6 sm:grid-cols-3 sm:p-8">
        <div>
          <div className="font-display text-lg">Two inks, eight shirts</div>
          <p className="mt-1 text-sm text-ink/75">Cream ink on dark shirts, dark ink on light ones. The badge is redrawn for each so it always reads.</p>
        </div>
        <div>
          <div className="font-display text-lg">Printed when you order</div>
          <p className="mt-1 text-sm text-ink/75">Direct-to-garment print on a 100% cotton Bella + Canvas 3001, produced in the print lab nearest to you.</p>
        </div>
        <div>
          <div className="font-display text-lg">Real history</div>
          <p className="mt-1 text-sm text-ink/75">Every local gets a founding year and a one-paragraph obituary for the trade. Read them on each shirt page.</p>
        </div>
      </section>
    </div>
  );
}
