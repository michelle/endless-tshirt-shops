import Studio from '@/components/Studio';

export default function Home() {
  return (
    <main className="wrap">
      <header className="masthead">
        <div className="kicker">The Atlas of Persons</div>
        <h1>The Isle of You</h1>
        <p className="sub">A sea chart of one person. Engraved to order. Worn.</p>
        <div className="rule-orn">
          <span />
          <i>&#9670;</i>
          <span />
        </div>
      </header>

      <p className="pitch">
        Every person is a coastline. Answer six questions and our press engraves the island
        you turn out to be &#8212; your port, your mountain, the bay you retreat to, and the
        thing waiting in the deep water. The plate is drawn from your answers alone, so
        <em> no two shirts have ever come off this press alike</em>.
      </p>

      <div className="steps">
        <div>
          <div className="n">I</div>
          <p>Answer six short questions.</p>
        </div>
        <div>
          <div className="n">II</div>
          <p>Watch your island appear as you type.</p>
        </div>
        <div>
          <div className="n">III</div>
          <p>We print it direct-to-garment and ship it.</p>
        </div>
      </div>

      <Studio />
    </main>
  );
}
