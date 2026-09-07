import Store from "@/components/Store";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 sm:py-24">
      <header className="mb-16 max-w-2xl text-center">
        <h1 className="font-mono text-lg font-semibold tracking-tight text-emerald-400">
          datetime.store
        </h1>
        <p className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          We sell a t-shirt with the current datetime.
        </p>
        <p className="mt-4 text-balance text-zinc-400">
          Pick a fit and size. The shirt below is live — it ticks in real
          milliseconds since the Unix epoch. The instant you hit buy, we
          freeze it and print exactly that number, nothing else.
        </p>
      </header>

      <Store />

      <section className="mt-24 grid w-full max-w-4xl grid-cols-1 gap-8 border-t border-zinc-900 pt-12 text-sm text-zinc-500 sm:grid-cols-3">
        <div>
          <h2 className="mb-1 font-semibold text-zinc-300">One of one</h2>
          <p>
            Every shirt shows a different millisecond. No two datetime.store
            shirts are ever the same.
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-zinc-300">Printed on demand</h2>
          <p>
            Nothing is pre-made. Your order goes straight to Prodigi&rsquo;s
            print network the moment payment succeeds.
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-zinc-300">Free shipping</h2>
          <p>Every order ships free, worldwide, no minimum.</p>
        </div>
      </section>
    </main>
  );
}
