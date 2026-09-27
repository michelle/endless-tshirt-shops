import Customizer from "@/components/Customizer";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b8862d]">
          Fully custom DTG print - made for one human only
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          Every person deserves
          <br />
          a dictionary entry.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[#1d1a15]/70">
          Type a name. We write the definition (or write your own), print it
          direct-to-garment in museum-grade colour, and ship it anywhere on
          Earth. No two shirts are ever the same.
        </p>
      </section>

      <Customizer cancelled={cancelled === "1"} />

      <section className="mt-20 grid gap-6 border-t border-[#1d1a15]/15 pt-12 sm:grid-cols-3">
        {[
          {
            n: "01",
            t: "You define a human",
            d: "A name, a part of speech, a definition. Ours are automatically - and lovingly - written; yours can say anything.",
          },
          {
            n: "02",
            t: "We print it for real",
            d: "Your entry is typeset like a page from a dictionary and printed with DTG inks that handle full colour and fine detail.",
          },
          {
            n: "03",
            t: "It ships after you pay",
            d: "Payment is confirmed by Stripe first - only then does your shirt enter production at a print lab near you.",
          },
        ].map((s) => (
          <div key={s.n}>
            <p className="font-serif text-3xl text-[#b8862d]">{s.n}</p>
            <h2 className="mt-2 font-serif text-xl">{s.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#1d1a15]/70">
              {s.d}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
