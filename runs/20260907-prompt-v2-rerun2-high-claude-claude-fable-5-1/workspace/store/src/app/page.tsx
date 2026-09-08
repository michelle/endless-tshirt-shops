import Link from "next/link";
import { PRODUCTS, formatPrice, PRICE_CENTS } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { DesignPreview } from "@/components/ShirtMockup";

export default function Home() {
  const hero = PRODUCTS[0];
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid gap-8 md:grid-cols-2 items-center py-12 md:py-20">
        <div>
          <p className="stamp mb-6">Form DOF-1 · Approved</p>
          <h1 className="font-slab text-4xl sm:text-6xl leading-[1.05]">
            Official apparel for the futures that <span className="text-accent">never arrived.</span>
          </h1>
          <p className="mt-6 text-ink-2 max-w-prose">
            Jetpack commutes. Lunar hotels. A three-course dinner in one capsule. Every decade was promised a future it never got, so
            we set up the agencies that were meant to run it. Seven bureaus, seven seals, printed to order on 100% cotton.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="#collection" className="btn">
              Browse the bureaus
            </Link>
            <Link href="/about" className="btn btn-outline">
              Sizing &amp; shipping
            </Link>
          </div>
          <p className="mt-6 text-xs uppercase tracking-widest text-ink-2">All shirts {formatPrice(PRICE_CENTS)} · Ships worldwide</p>
        </div>
        <DesignPreview product={hero} colorId={hero.defaultColor} idPrefix="hero" className="card !shadow-[12px_12px_0_var(--color-accent)] p-6" />
      </section>

      <section id="collection" className="py-10">
        <div className="rule pt-6 flex items-end justify-between gap-4 flex-wrap">
          <h2 className="font-slab text-3xl sm:text-4xl">The bureaus</h2>
          <p className="text-sm text-ink-2">Unisex fit · XS–3XL · Pick your colour on each page</p>
        </div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <section className="py-14 grid gap-6 md:grid-cols-3">
        {[
          ["01", "Printed to order", "Each seal is printed direct-to-garment on a Bella+Canvas 3001 when you order it. No warehouse, no dead stock."],
          ["02", "Ships worldwide", "Orders are printed at the lab closest to you and dispatched in 2–5 business days with tracking."],
          ["03", "Secure checkout", "Card payments handled by Stripe. We never see your card number, only your shirt size."],
        ].map(([n, t, d]) => (
          <div key={n} className="dashed p-5">
            <p className="text-accent font-bold">{n}</p>
            <p className="font-slab text-xl mt-1">{t}</p>
            <p className="text-sm text-ink-2 mt-2">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
