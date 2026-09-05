import ProductConfigurator from "@/components/ProductConfigurator";

export default function Home() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <header className="mb-16 text-center">
          <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight">
            datetime.store
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-neutral-400">
            We sell one t-shirt: printed with the exact datetime you buy it.
          </p>
        </header>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-950/60 p-6 sm:p-12">
          <ProductConfigurator />
        </section>

        <section className="mt-20 grid gap-10 sm:grid-cols-3 text-sm text-neutral-400">
          <div>
            <h2 className="font-display text-white text-base font-bold mb-2">
              01 · Pick a moment
            </h2>
            <p>
              Choose a fit and size. When you click buy, we capture the
              current time down to the millisecond — that number becomes your
              artwork.
            </p>
          </div>
          <div>
            <h2 className="font-display text-white text-base font-bold mb-2">
              02 · Pay with Stripe
            </h2>
            <p>
              Checkout is hosted by Stripe. We never see or store your card
              details, and Apple Pay / Google Pay work automatically.
            </p>
          </div>
          <div>
            <h2 className="font-display text-white text-base font-bold mb-2">
              03 · Printed by Prodigi
            </h2>
            <p>
              The instant payment clears, we send your one-of-a-kind artwork
              to Prodigi&apos;s print network, who print, pack, and ship your
              shirt.
            </p>
          </div>
        </section>

        <footer className="mt-24 text-center text-xs text-neutral-600">
          <p>
            datetime.store — every shirt is unique. No two timestamps are
            ever the same.
          </p>
        </footer>
      </div>
    </main>
  );
}
