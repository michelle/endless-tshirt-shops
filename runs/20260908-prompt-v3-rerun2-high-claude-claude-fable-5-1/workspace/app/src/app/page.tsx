import { Designer } from "@/components/Designer";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const canceled = sp.canceled === "1";

  return (
    <>
      <section className="starfield relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-16 text-center sm:pt-24">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-gold">Astronomically accurate · Printed to order</p>
          <h1 className="font-display mx-auto max-w-3xl text-4xl leading-tight sm:text-6xl">
            The night sky of your moment, printed on a tee.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Pick a place, a date and a time. We calculate the real positions of thousands of stars above that spot at that
            exact minute and print the map, with your words, directly onto the shirt. No two are alike.
          </p>
          <a href="#design" className="btn-primary mt-8">
            Design yours · $38
          </a>
        </div>
      </section>

      <section id="design" className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <Designer canceled={canceled} />
      </section>

      <section id="how" className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-3">
          {[
            {
              t: "Real astronomy",
              d: "5,000+ stars from the Yale Bright Star Catalogue placed by sidereal time and your coordinates. Zenith at the centre, horizon at the rim, North up.",
            },
            {
              t: "Made for DTG",
              d: "Direct-to-garment printing lays down ink one shirt at a time, so a design that is different for every customer costs no more than a mass-printed one.",
            },
            {
              t: "Printed & shipped to you",
              d: "Paid orders are sent straight to our print partner, printed on a Gildan Softstyle tee and shipped worldwide with tracking.",
            },
          ].map((f) => (
            <div key={f.t}>
              <h3 className="font-display mb-2 text-xl">{f.t}</h3>
              <p className="text-sm leading-relaxed text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
