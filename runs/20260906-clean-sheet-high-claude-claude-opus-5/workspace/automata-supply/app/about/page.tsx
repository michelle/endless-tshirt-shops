import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Automata Supply",
  description: "How the shirts are generated, printed and shipped.",
};

export default function AboutPage() {
  return (
    <div className="wrap" style={{ maxWidth: 680, padding: "64px 24px 90px" }}>
      <p className="eyebrow">About</p>
      <h1 className="hero-title" style={{ fontSize: "clamp(30px, 4vw, 46px)" }}>
        Three cells in, one cell out.
      </h1>

      <p className="product-note">
        An elementary cellular automaton is a row of cells, each either alive or
        dead. To produce the next row you look at every cell together with its
        two neighbours — eight possible arrangements — and a rule tells you
        whether the cell below is alive or dead. Eight yes/no answers is one
        byte, so there are exactly 256 rules, numbered 0 to 255.
      </p>
      <p className="product-note">
        That is the whole system. There is no randomness in it anywhere. And yet
        Rule 30 produces a sequence so hard to predict that it shipped as a
        random number generator; Rule 110 was proven capable of running any
        computation at all; Rule 184 spontaneously reproduces the shockwave that
        travels backwards through a traffic jam. Nobody designed those
        behaviours. They were found.
      </p>

      <h2 className="section-title" style={{ margin: "40px 0 14px" }}>
        How a shirt is made
      </h2>
      <p className="product-note">
        Every design is a pure function of five numbers: the rule, the seed, the
        initial-row mode, the lattice width and the ink. When you order, we
        evolve the automaton again at print resolution and hand the resulting
        3000 × 3758 PNG straight to the printer. The preview you approved and
        the file that hits the garment come from the same code path.
      </p>
      <p className="product-note">
        The background is transparent, so only live cells receive ink and the
        fabric colour shows through everywhere else. Prints are
        direct-to-garment on a Gildan 64000 unisex softstyle tee, 100% ring-spun
        cotton, produced on demand by Prodigi and shipped from the facility
        closest to you.
      </p>

      <h2 className="section-title" style={{ margin: "40px 0 14px" }}>
        Returns
      </h2>
      <p className="product-note">
        Because each shirt is printed for one order, we can only replace items
        that arrive damaged or misprinted. Email a photo within 30 days and we
        will reprint it.
      </p>
    </div>
  );
}
