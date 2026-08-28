import StoreExperience from "@/components/StoreExperience";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-5xl px-6 py-14 md:py-20 flex-1 flex flex-col gap-14">
        <header className="text-center flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.3em] uppercase text-black/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
            live
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            datetime.store
          </h1>
          <p className="text-lg md:text-xl text-black/60 max-w-xl">
            we sell a t-shirt with the current datetime.
          </p>
        </header>

        <StoreExperience />

        <section className="border-t border-black/10 pt-8 grid sm:grid-cols-3 gap-6 text-sm text-black/55">
          <div>
            <p className="font-semibold text-black/80 mb-1">One-of-one</p>
            <p>
              The number on the shirt is the exact millisecond you complete
              checkout. It ticks live until then — nobody else can ever buy
              the same shirt.
            </p>
          </div>
          <div>
            <p className="font-semibold text-black/80 mb-1">
              Printed on demand
            </p>
            <p>
              Every order is queued straight to our print partner the moment
              payment clears. No inventory, no pre-printed stock.
            </p>
          </div>
          <div>
            <p className="font-semibold text-black/80 mb-1">
              Shipped to your door
            </p>
            <p>
              Free shipping across the US. You&rsquo;ll get an email
              confirmation with your order number right after checkout.
            </p>
          </div>
        </section>

        <footer className="text-center text-xs text-black/35 pt-4">
          Payments by Stripe (test mode) · Fulfillment by Prodigi (sandbox)
        </footer>
      </div>
    </main>
  );
}
