import { PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  return (
    <div>
      <section className="border-b-4 border-ink bg-stamp/5">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <div className="font-type text-xs uppercase tracking-[0.3em] text-stamp">
              Interoffice Merchandise Memo
            </div>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">
              Cryptids Have Jobs Now.
              <br /> They Hate It.
            </h1>
            <p className="mt-5 text-lg text-ink/80">
              The Bureau of Ordinary Monsters is the federal agency nobody
              voted for, staffed entirely by legends who were promised
              mystery and instead got a badge, a ribbon title, and a
              performance review. Every shirt is a real employee ID for a
              cryptid who&apos;d rather be feared than filed under
              &ldquo;pending.&rdquo;
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#personnel"
                className="stamped rounded-md bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper"
              >
                Browse Personnel Files
              </a>
              <a
                href="/about"
                className="rounded-md border-2 border-ink px-6 py-3 font-display text-sm uppercase tracking-wide hover:bg-ink hover:text-paper"
              >
                Read the Charter
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="personnel" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="font-type text-xs uppercase tracking-[0.3em] text-ink/50">
              Active Case Files
            </div>
            <h2 className="font-display text-3xl">Meet the Staff</h2>
          </div>
          <div className="hidden font-type text-xs text-ink/50 sm:block">
            Printed &amp; shipped to order — 100% cotton, unisex fit
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t-4 border-ink bg-ink/95 py-16 text-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          <div>
            <div className="font-display text-lg uppercase tracking-wide text-stamp">
              01. Order
            </div>
            <p className="mt-2 text-sm text-paper/70">
              Pick a cryptid, size, and shirt color. No two personnel files
              are alike, and neither are their seams.
            </p>
          </div>
          <div>
            <div className="font-display text-lg uppercase tracking-wide text-stamp">
              02. Printed on Demand
            </div>
            <p className="mt-2 text-sm text-paper/70">
              Every order routes straight to our print partner&apos;s
              on-demand line — nothing is warehoused, nothing goes stale.
            </p>
          </div>
          <div>
            <div className="font-display text-lg uppercase tracking-wide text-stamp">
              03. Shipped Discreetly
            </div>
            <p className="mt-2 text-sm text-paper/70">
              Plain packaging. The Bureau does not officially exist, and
              neither, technically, does your package.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
