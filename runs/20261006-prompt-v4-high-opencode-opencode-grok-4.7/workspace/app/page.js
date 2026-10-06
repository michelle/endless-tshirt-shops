import Store from "../components/Store.js"

export default function HomePage() {
  return (
    <>
      <div className="wrap">
        <header className="site">
          <a className="mark" href="/">VESPER</a>
          <nav>
            <a href="#chart">The chart</a>
            <a href="#shirt">The shirt</a>
            <a href="/policies">Care</a>
          </nav>
        </header>
        <section className="hero">
          <p className="kicker">Direct to garment · one sky, one shirt</p>
          <h1>The sky from a night you can name.</h1>
          <p className="lede">
            A date, a place, the people who were there. We chart the stars that stood above that horizon and print them, once, on cotton.
          </p>
          <hr className="rule" />
        </section>
        <Store />
        <section className="essay" id="how">
          <div>
            <p className="num">01</p>
            <h3>Name the night</h3>
            <p>Any evening you can put a date and a place to. A wedding, a birth, the kitchen you didn’t leave.</p>
          </div>
          <div>
            <p className="num">02</p>
            <h3>We chart the real sky</h3>
            <p>Bright stars from the catalog, placed for that latitude and that minute. Not a random splatter with your name on it.</p>
          </div>
          <div>
            <p className="num">03</p>
            <h3>Printed after you pay</h3>
            <p>Direct-to-garment, so every shirt can be different. The print file goes to Prodigi only once Stripe says the payment succeeded.</p>
          </div>
        </section>
        <section className="garment" id="shirt">
          <h2>The blank</h2>
          <p className="lede">
            Gildan Softstyle 64000, a unisex modern classic. Most colours are 100% ring-spun cotton; a few heathers in the wider catalogue include polyester. We only sell solid colours that take a chart cleanly.
          </p>
          <table>
            <thead>
              <tr><th>Size</th><th>Fits chest</th><th>Laid flat, width × length</th></tr>
            </thead>
            <tbody>
              {[
                ["XS", "30–32 in", "16 × 27 in"],
                ["S", "34–36", "18 × 28"],
                ["M", "38–40", "20 × 29"],
                ["L", "42–44", "22 × 30"],
                ["XL", "46–48", "24 × 31"],
                ["2XL", "50–52", "26 × 32"],
                ["3XL", "54–56", "28 × 33"],
              ].map((row) => (
                <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="note">Measurements from the Gildan 64000 spec, approximate. Between sizes, size up. The chart sits on the chest — linework, not a solid panel, so the shirt stays soft.</p>
        </section>
      </div>
      <footer className="site wrap">
        <span>© 2026 Vesper</span>
        <a href="/policies">Shipping, care, privacy</a>
      </footer>
    </>
  )
}
