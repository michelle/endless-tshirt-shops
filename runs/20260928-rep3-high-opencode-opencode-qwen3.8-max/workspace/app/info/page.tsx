import Link from 'next/link';

export const metadata = { title: 'Details — Starryborn' };

export default function InfoPage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/">
          STARRYBORN
          <small>wear the night you were born</small>
        </a>
        <nav>
          <Link href="/#studio">Design yours</Link>
          <Link href="/info">Details</Link>
        </nav>
      </header>

      <div className="order-wrap prose">
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>The fine print</h1>

        <h2>The product</h2>
        <p>
          One unisex tee — the Bella&nbsp;+&nbsp;Canvas 3001, 100% combed ring-spun cotton,
          retail fit — direct-to-garment printed with your computed sky on the front. Six
          colours, sizes XS–4XL depending on colour. $34.00 plus $6.00 standard shipping,
          everywhere we ship.
        </p>

        <h2>How the sky is computed</h2>
        <p>
          Your chart is not a template. At order time we convert your birth moment and place
          to a precise UTC instant (using the full timezone database, including historical
          daylight-saving rules), compute local sidereal time, precess 2,886 catalogue stars
          from the HYG database (v4.0, CC-BY-SA 4.0) to the equinox of your birth date, apply
          atmospheric refraction near the horizon, and project the result azimuthally — zenith
          at the centre, north up, east to the left, exactly as if you lay down and looked up.
          The moon is drawn at its true position and phase; if you were born in daylight, the
          sun is shown where it actually stood.
        </p>

        <h2>Payment &amp; production</h2>
        <p>
          Checkout is handled by Stripe; we never see or store your card. Your shirt is sent
          to our print partner Prodigi <em>only after</em> Stripe confirms payment, and printed
          on demand at the lab closest to you — typically produced within 2–5 business days,
          then shipped white-label. Your order page shows every stage, with tracking when the
          lab provides it.
        </p>

        <h2>Shipping</h2>
        <p>
          Standard shipping is included in the flat $6.00 fee and covers 30+ countries across
          North America, Europe, UK, Japan, Singapore, Australia and New Zealand. Delivery
          times after production are typically 3–10 business days depending on destination.
        </p>

        <h2>Returns</h2>
        <p>
          Every shirt is made uniquely for you, so we can’t accept change-of-mind returns.
          If your shirt arrives damaged, misprinted, or doesn’t match the design you approved
          in the preview, contact us within 30 days with your order reference and we’ll reprint
          or refund it — no need to send it back.
        </p>

        <h2>Accuracy &amp; honesty</h2>
        <p>
          Positions are accurate to well under a degree — far finer than the eye can judge on
          fabric. If you don’t know your birth time, we render the evening sky (9:00 PM local)
          and mark it “approximate” on the shirt. Times you enter are interpreted in the
          timezone of the city you pick; for manual coordinates you give us the UTC offset
          that applied at your birth.
        </p>

        <h2>Your data</h2>
        <p>
          We use your birth details only to compute and print your design, and your address
          only to ship it. Order data lives in Stripe (payment, shipping) and Prodigi
          (fulfilment); there is no account system and no marketing list.
        </p>

        <h2>Order lookup</h2>
        <p>
          Your order tracker is the link shown after checkout (<code>/order/cs_…</code>).
          Keep it — it shows payment, production and shipping status live. Lost it? Email
          support with the address you used at checkout.
        </p>
      </div>

      <footer className="site-footer">
        <p>
          <Link href="/">← back to the sky</Link>
        </p>
      </footer>
    </main>
  );
}
