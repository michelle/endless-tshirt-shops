import Link from "next/link";
import ShowcasePreview from "@/components/ShowcasePreview";

export default function Home() {
  return (
    <div>
      <section className="star-bg relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="uppercase tracking-[0.3em] text-xs text-amber-300/80 mb-4">
              Direct-to-garment · Made on order
            </p>
            <h1 className="font-serif-display text-5xl sm:text-6xl leading-[1.05] mb-6">
              Wear your own <span className="italic text-amber-200">constellation.</span>
            </h1>
            <p className="text-white/70 text-lg max-w-md mb-8">
              Give us a name, a date, an inside joke — anything. Our engine turns it into a
              star map that has never existed before, mathematically unique to your words,
              then prints it straight onto a premium tee just for you.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/design"
                className="inline-flex items-center rounded-full bg-amber-300 text-black font-semibold px-7 py-3 hover:bg-amber-200 transition"
              >
                Design Yours — from $32
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center rounded-full border border-white/25 px-7 py-3 hover:border-white/50 transition"
              >
                How it works
              </Link>
            </div>
          </div>
          <ShowcasePreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 grid sm:grid-cols-3 gap-8">
        {[
          {
            title: "1. Tell us your story",
            body: "A name, a couple who met in 2019, your dog's name, your band — anything short and meaningful.",
          },
          {
            title: "2. We generate your sky",
            body: "A deterministic algorithm turns your words into a one-of-a-kind star field — same input always regenerates the same design, so no two phrases ever collide.",
          },
          {
            title: "3. We print & ship it",
            body: "Once payment succeeds, your artwork goes straight to our DTG print partner and ships directly to your door.",
          },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-white/10 p-6 bg-white/[0.03]">
            <h3 className="font-serif-display text-xl mb-2">{s.title}</h3>
            <p className="text-white/60 text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-amber-400/10 p-10 text-center">
          <h2 className="font-serif-display text-3xl mb-3">No two shirts are ever the same.</h2>
          <p className="text-white/60 max-w-xl mx-auto mb-6">
            Because the artwork is generated from your exact input, it&apos;s effectively
            impossible for two customers to end up with the same design. It&apos;s not a print
            of a photo — it&apos;s art made only for you.
          </p>
          <Link
            href="/design"
            className="inline-flex items-center rounded-full bg-white text-black font-semibold px-7 py-3 hover:bg-white/90 transition"
          >
            Start Designing
          </Link>
        </div>
      </section>
    </div>
  );
}
