import Link from "next/link";

export default function Home() {
  const sample = {
    date: "2019-06-14",
    lat: 48.8566,
    lng: 2.3522,
    loc: "Paris, France",
    title: "The Night We Met",
    sub: "Est. 2019",
  };
  const sampleUrl = `/api/star-map?date=${sample.date}&lat=${sample.lat}&lng=${sample.lng}&loc=${encodeURIComponent(
    sample.loc
  )}&title=${encodeURIComponent(sample.title)}&sub=${encodeURIComponent(sample.sub)}`;

  return (
    <>
      <header className="site-header">
        <div className="container inner">
          <Link href="/" className="brand">
            STELL<span>ARA</span>
          </Link>
          <nav className="nav">
            <a href="#how">How it works</a>
            <a href="#why">Why DTG</a>
            <Link href="/design" className="btn btn-primary">
              Design yours
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="stars-bg" />
          <div className="container">
            <div className="eyebrow">Custom star map t-shirts</div>
            <h1>
              Wear the night
              <br />
              that <em>mattered</em>.
            </h1>
            <p className="sub">
              Every Stellara shirt is printed with the exact night sky from a
              moment only you know — a first date, a birth, a goodbye. One
              shirt, one sky, made just for you.
            </p>
            <div className="cta-row">
              <Link href="/design" className="btn btn-primary">
                Design your shirt
              </Link>
              <a href="#how" className="btn btn-ghost">
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="container">
            <h2>Three steps to a one-of-a-kind shirt</h2>
            <p className="lead">
              No two Stellara shirts are ever the same, because no two moments
              are.
            </p>
            <div className="steps">
              <div className="step">
                <div className="num">01</div>
                <h3>Pick your moment</h3>
                <p>
                  Choose a date and a place. We compute the real positions of
                  the stars as they appeared that night.
                </p>
              </div>
              <div className="step">
                <div className="num">02</div>
                <h3>Make it yours</h3>
                <p>
                  Add a title, a line, and pick your shirt colour and size.
                  Watch your sky come to life in real time.
                </p>
              </div>
              <div className="step">
                <div className="num">03</div>
                <h3>We print &amp; ship</h3>
                <p>
                  Printed direct-to-garment on demand and shipped to your door.
                  Nothing is made until you order it.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="why">
          <div className="container showcase">
            <div className="mock">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sampleUrl} alt="Example star map shirt design" />
            </div>
            <div>
              <h2>Why a star map?</h2>
              <p className="lead">
                Because the sky is the one thing that was there for every
                important moment — and it never repeats.
              </p>
              <ul>
                <li>Anniversaries &amp; first dates</li>
                <li>Births &amp; birthdays</li>
                <li>Weddings &amp; proposals</li>
                <li>Memorials &amp; goodbyes</li>
                <li>Graduations &amp; new beginnings</li>
              </ul>
              <div style={{ marginTop: 28 }}>
                <Link href="/design" className="btn btn-primary">
                  Start designing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container inner">
          <div className="brand" style={{ fontSize: 18 }}>
            STELL<span>ARA</span>
          </div>
          <div>Printed on demand · Direct-to-garment · Made for you</div>
        </div>
      </footer>
    </>
  );
}
