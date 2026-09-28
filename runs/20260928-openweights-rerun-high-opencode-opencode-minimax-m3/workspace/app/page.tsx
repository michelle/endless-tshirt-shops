import DesignForm from "@/components/DesignForm";
import { PRICE_CENTS } from "@/lib/design";

export const dynamic = "force-dynamic";

const PRICE_LABEL = `$${(PRICE_CENTS / 100).toFixed(2)} USD`;

export default function HomePage({
  searchParams,
}: {
  searchParams: { cancelled?: string };
}) {
  const cancelled = searchParams?.cancelled === "1";
  return (
    <main className="container">
      <header style={{ marginBottom: 32, textAlign: "center" }}>
        <p className="kicker">Star Map Tee · DTG print · global shipping</p>
        <h1
          className="hero"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
            lineHeight: 1.1,
            margin: "12px 0 8px",
          }}
        >
          A night-sky postcard,
          <br />
          printed on a shirt.
        </h1>
        <p style={{ color: "var(--ink-soft)", maxWidth: 640, margin: "16px auto 0", fontSize: "1.05rem" }}>
          Pick a date and a place. We render the sky exactly as it was that night &mdash;
          moon phase, constellations, stars &mdash; and DTG-print it onto a Bella+Canvas
          tee. One of one, because the night that mattered was yours.
        </p>
        <p
          style={{
            color: "var(--accent-strong)",
            marginTop: 18,
            fontFamily: "Georgia, serif",
            fontSize: "1.1rem",
          }}
        >
          {PRICE_LABEL} · worldwide shipping included
        </p>
      </header>

      {cancelled && (
        <div className="banner err" style={{ marginBottom: 24 }}>
          Checkout was cancelled &mdash; nothing was charged. Your design is still
          here, change anything you like.
        </div>
      )}

      <DesignForm />

      <hr className="divider" />

      <section style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <article className="card">
          <p className="kicker">One of one</p>
          <h3 className="hero" style={{ fontSize: "1.2rem", margin: "6px 0 8px" }}>
            Nobody else owns that sky.
          </h3>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", margin: 0 }}>
            The night sky is rendered from your input deterministically &mdash; no two
            customers ever get the same shirt.
          </p>
        </article>
        <article className="card">
          <p className="kicker">Real moon phase</p>
          <h3 className="hero" style={{ fontSize: "1.2rem", margin: "6px 0 8px" }}>
            The moon, as it was.
          </h3>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", margin: 0 }}>
            We compute the phase from the date you give us, so the moon on
            your shirt really was the moon that night.
          </p>
        </article>
        <article className="card">
          <p className="kicker">DTG, not screenprint</p>
          <h3 className="hero" style={{ fontSize: "1.2rem", margin: "6px 0 8px" }}>
            Photographic detail.
          </h3>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", margin: 0 }}>
            Direct-to-garment inkjet means gradients, subtle tones, and the
            exact colour of starlight. No screenprint dot patterns.
          </p>
        </article>
        <article className="card">
          <p className="kicker">White-label shipping</p>
          <h3 className="hero" style={{ fontSize: "1.2rem", margin: "6px 0 8px" }}>
            Ships from a lab near you.
          </h3>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", margin: 0 }}>
            Prodigi prints your tee at the closest lab and posts it directly
            to the address you give at checkout.
          </p>
        </article>
      </section>

      <footer style={{ textAlign: "center", marginTop: 56, color: "var(--ink-dim)", fontSize: "0.85rem" }}>
        StarMap Tee is a single-tenant reference store. Prices, SKUs and
        shipping rules are easy to change in <code>lib/design.ts</code> and
        <code> app/api/checkout/route.ts</code>.
      </footer>
    </main>
  );
}
