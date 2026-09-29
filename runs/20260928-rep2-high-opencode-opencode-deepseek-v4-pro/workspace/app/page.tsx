import Customizer from "@/components/Customizer";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <div className="container inner">
          <div className="brand">
            STELLAR<span className="dot">.</span>
          </div>
          <nav className="nav">
            <a href="#design">Design</a>
            <a href="#how">How it works</a>
          </nav>
        </div>
      </header>

      <section className="hero container">
        <div className="eyebrow">Custom star map tees</div>
        <h1>
          Wear the sky from the
          <br />
          night that mattered.
        </h1>
        <p>
          Every shirt is a one-of-a-kind map of the stars above a moment you
          choose — a birthday, a first kiss, a goodbye. Printed on demand, just
          for you.
        </p>
      </section>

      <section id="design">
        <Customizer />
      </section>

      <section className="how" id="how">
        <div className="container">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="num">01</div>
              <h3>Choose your moment</h3>
              <p>
                Pick a date and a place. We compute the exact position of the
                stars for that time and location.
              </p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h3>Make it yours</h3>
              <p>
                Add a title, pick your shirt colour and size. Your design is
                generated live, right in front of you.
              </p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h3>We print &amp; ship</h3>
              <p>
                Pay securely, and we print your unique design with
                direct-to-garment technology and ship it to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          Stellar — custom star map tees. Printed on demand with DTG.
        </div>
      </footer>
    </main>
  );
}
