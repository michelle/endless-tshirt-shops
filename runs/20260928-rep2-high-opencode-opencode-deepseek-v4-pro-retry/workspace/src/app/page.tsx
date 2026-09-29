import Link from "next/link";

export default function Home() {
  return (
    <main>
      {/* Nav */}
      <header className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 24, paddingBottom: 24 }}>
        <div className="serif" style={{ fontSize: 24, letterSpacing: "0.12em", color: "var(--gold)" }}>
          STELLARA
        </div>
        <nav style={{ display: "flex", gap: 24, fontSize: 15, color: "var(--ink-dim)" }}>
          <a href="#how">How it works</a>
          <a href="#gift">Why it matters</a>
          <Link href="/customize" className="btn btn-primary" style={{ padding: "10px 22px", fontSize: 14 }}>
            Design yours
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container" style={{ textAlign: "center", paddingTop: 72, paddingBottom: 72 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--gold-soft)", marginBottom: 20 }}>
          Direct-to-garment · one of a kind
        </div>
        <h1 className="serif" style={{ fontSize: 64, lineHeight: 1.05, margin: "0 0 20px", fontWeight: 400 }}>
          Wear the night
          <br />
          you&apos;ll never forget.
        </h1>
        <p style={{ fontSize: 19, color: "var(--ink-dim)", maxWidth: 560, margin: "0 auto 36px" }}>
          Stellara turns any date and place into a real map of the night sky —
          the exact stars that were overhead — printed on a premium cotton tee.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link href="/customize" className="btn btn-primary">
            Create your star map
          </Link>
          <a href="#how" className="btn btn-ghost">
            See how it works
          </a>
        </div>
      </section>

      {/* Sample preview */}
      <section className="container" style={{ display: "flex", gap: 40, alignItems: "center", paddingTop: 24, paddingBottom: 72 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 320,
              height: 400,
              borderRadius: 20,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/design?date=2015-06-14&lat=40.7128&lng=-74.006&title=The%20Night%20We%20Met&names=Emma%20%26%20Jack&location=New%20York%2C%20NY&color=black&format=svg"
              alt="Sample star map"
              style={{ width: "100%", height: "100%", objectFit: "contain", background: "#0a0d1a" }}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h2 className="serif" style={{ fontSize: 36, fontWeight: 400, margin: "0 0 16px" }}>
            A real sky, not a stock design.
          </h2>
          <p style={{ color: "var(--ink-dim)", fontSize: 17, marginBottom: 24 }}>
            We compute the positions of hundreds of real stars for your exact
            moment and place — the night you were born, the day you said yes,
            the evening you first met. Every shirt is printed to order, so no
            two are alike.
          </p>
          <ul style={{ color: "var(--ink-dim)", fontSize: 16, lineHeight: 2, paddingLeft: 20 }}>
            <li>Your date, your place, your words</li>
            <li>Real constellations, drawn from a star catalog</li>
            <li>Printed on a soft Gildan 64000 tee</li>
            <li>Shipped worldwide, straight to their door</li>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container" style={{ paddingTop: 24, paddingBottom: 72 }}>
        <h2 className="serif" style={{ fontSize: 36, fontWeight: 400, textAlign: "center", margin: "0 0 40px" }}>
          How it works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { n: "1", t: "Pick a moment", d: "Choose a date, a place, and the words you want to remember it by." },
            { n: "2", t: "See your sky", d: "We render the real night sky for that moment — live, before you buy." },
            { n: "3", t: "We print & ship", d: "Pay securely, and we print your one-of-a-kind shirt and ship it anywhere." },
          ].map((s) => (
            <div key={s.n} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: 28 }}>
              <div className="serif" style={{ fontSize: 40, color: "var(--gold)", marginBottom: 12 }}>{s.n}</div>
              <h3 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: "0 0 8px" }}>{s.t}</h3>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why it matters */}
      <section id="gift" className="container" style={{ paddingTop: 24, paddingBottom: 72, textAlign: "center" }}>
        <h2 className="serif" style={{ fontSize: 36, fontWeight: 400, margin: "0 0 16px" }}>
          The gift that means something.
        </h2>
        <p style={{ color: "var(--ink-dim)", fontSize: 17, maxWidth: 560, margin: "0 auto 36px" }}>
          Birthdays, anniversaries, weddings, memorials. A star map is a way to
          say &ldquo;this moment mattered&rdquo; — and to wear it.
        </p>
        <Link href="/customize" className="btn btn-primary">
          Start designing
        </Link>
      </section>

      <footer className="container" style={{ borderTop: "1px solid var(--line)", paddingTop: 24, paddingBottom: 40, color: "var(--ink-dim)", fontSize: 14, display: "flex", justifyContent: "space-between" }}>
        <span className="serif" style={{ color: "var(--gold)" }}>STELLARA</span>
        <span>Custom star map t-shirts · printed to order</span>
      </footer>
    </main>
  );
}
