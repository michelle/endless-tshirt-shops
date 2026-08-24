import { ProductConfigurator } from "@/components/ProductConfigurator";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-neutral-900">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="font-mono text-lg tracking-tight">
            datetime<span className="text-orange-500">.</span>store
          </div>
          <div className="text-xs font-mono text-neutral-500 hidden sm:block">
            PRINTED &amp; SHIPPED BY PRODIGI
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            We sell a t-shirt with the{" "}
            <span className="text-orange-500">current datetime.</span>
          </h1>
          <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
            One product. One idea. The instant your payment clears, we print the
            exact date, time, and millisecond onto your shirt and ship it out.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-24">
          <ProductConfigurator />
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-24 grid gap-8 sm:grid-cols-3 text-sm text-neutral-400">
          <div>
            <div className="font-mono text-orange-500 mb-2">01 — ORDER</div>
            Pick a style, size, and color, then check out securely with Stripe.
          </div>
          <div>
            <div className="font-mono text-orange-500 mb-2">02 — PRINT</div>
            We capture the exact moment your payment is confirmed and generate
            your one-of-a-kind artwork.
          </div>
          <div>
            <div className="font-mono text-orange-500 mb-2">03 — SHIP</div>
            Prodigi prints and ships your shirt directly from a facility near
            you.
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-900 py-8">
        <div className="max-w-5xl mx-auto px-6 text-xs text-neutral-500 flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} datetime.store — a demo shop.</span>
          <span>Payments by Stripe · Fulfillment by Prodigi</span>
        </div>
      </footer>
    </div>
  );
}
