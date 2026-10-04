import Customizer from "./components/Customizer";

export default function Home() {
  return (
    <main>
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="text-lg font-bold tracking-tight">Pawtraits</span>
          </div>
          <nav className="text-sm text-stone-500">
            <a href="#customize" className="hover:text-stone-900">
              Design yours
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-10 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-600">
          Direct-to-garment · One of a kind
        </p>
        <h1 className="mx-auto max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Wear your best friend.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600">
          Upload a photo of your pet and we turn it into a custom illustrated
          portrait, printed on a premium tee just for you. No two shirts are
          ever the same.
        </p>
      </section>

      {/* Customizer */}
      <section id="customize" className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
          <Customizer />
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Upload a photo",
                d: "Pick your favorite picture of your pet — the clearer, the better.",
              },
              {
                n: "2",
                t: "Make it yours",
                d: "Choose an illustration style, shirt color, size, and your pet's name.",
              },
              {
                n: "3",
                t: "We print & ship",
                d: "Your one-off portrait is printed with DTG and shipped straight to your door.",
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mb-2 font-semibold">{s.t}</h3>
                <p className="text-sm text-stone-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center text-sm text-stone-400">
          <p>
            🐾 Pawtraits — custom pet portrait tees, printed on demand with
            direct-to-garment technology.
          </p>
        </div>
      </footer>
    </main>
  );
}
