"use client";

import { useEffect, useMemo, useState } from "react";

const styles = [
  { id: "fitted", label: "Fitted", note: "a little closer" },
  { id: "unisex", label: "Unisex", note: "room to breathe" },
];
const sizes = ["S", "M", "L", "XL"];

function formatStamp(date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  })
    .format(date)
    .replace(",", " ·");
}

function compactStamp(date) {
  const pad = (value, length = 2) => String(value).padStart(length, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function Timestamp({ timestamp, small = false }) {
  return (
    <span className={small ? "timestamp timestamp-small" : "timestamp"}>
      {small ? compactStamp(timestamp) : compactStamp(timestamp)}
    </span>
  );
}

function TShirt({ timestamp, disabled }) {
  return (
    <div className={`tee-stage${disabled ? " tee-stage-disabled" : ""}`} aria-label="Black t-shirt preview">
      <div className="spark spark-one">✦</div>
      <div className="spark spark-two">✦</div>
      <div className="tee-shadow" />
      <div className="tee">
        <div className="tee-sleeve tee-sleeve-left" />
        <div className="tee-sleeve tee-sleeve-right" />
        <div className="tee-body">
          <div className="tee-neck" />
          <div className="tee-ink">
            <Timestamp timestamp={timestamp} small />
            <span className="tee-subline">made of now</span>
          </div>
        </div>
      </div>
      <div className="stage-caption"><span>the current moment</span><span>printed front + center</span></div>
    </div>
  );
}

function Arrow({ children }) {
  return <span className="arrow-link">{children}<span aria-hidden="true">↗</span></span>;
}

export default function Home() {
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [style, setStyle] = useState("fitted");
  const [size, setSize] = useState("M");
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setTimestamp(new Date()), 37);
    return () => window.clearInterval(timer);
  }, []);

  const longStamp = useMemo(() => formatStamp(timestamp), [timestamp]);

  async function handlePurchase() {
    setStatus("loading");
    setNotice("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          size,
          timestamp: timestamp.toISOString(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Checkout could not start.");
      if (payload.url) {
        window.location.assign(payload.url);
        return;
      }
      setStatus("success");
      setNotice(payload.message || "Demo order captured.");
    } catch (error) {
      setStatus("error");
      setNotice(error.message);
    }
  }

  return (
    <main>
      <nav className="topbar shell" aria-label="Main navigation">
        <a className="wordmark" href="#top" aria-label="datetime.store home">datetime<span>.</span>store</a>
        <div className="nav-note"><span className="live-dot" /> live from your browser</div>
        <a className="nav-link" href="#story">why this exists <span aria-hidden="true">↓</span></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>drop 001</span><span className="eyebrow-line" /><span>always now</span></p>
          <h1>Wear the<br /><em>moment.</em></h1>
          <p className="hero-lede">A small, black t-shirt printed with the exact time you said yes to it. No two are ever quite the same.</p>
          <div className="hero-stamp">
            <span className="stamp-label">your moment, right now</span>
            <span className="stamp-value"><Timestamp timestamp={timestamp} /></span>
          </div>
          <a className="text-cta" href="#make-it-mine">make one for me <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-art">
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
          <div className="art-note art-note-top">a souvenir<br /><span>of right now</span></div>
          <TShirt timestamp={timestamp} />
          <div className="art-note art-note-bottom"><span className="tiny-star">✳</span> made when ordered<br /><span>ships with free US postage</span></div>
        </div>
      </section>

      <section className="ticker" aria-label="Current time ticker">
        <div className="ticker-track"><span>NOW IS A GOOD TIME</span><b>✳</b><span>NOW IS A GOOD TIME</span><b>✳</b><span>NOW IS A GOOD TIME</span><b>✳</b><span>NOW IS A GOOD TIME</span><b>✳</b></div>
      </section>

      <section className="buy-section shell" id="make-it-mine">
        <div className="section-intro">
          <p className="eyebrow"><span>01 / configure</span><span className="eyebrow-line" /></p>
          <h2>Make this<br /><em>one yours.</em></h2>
          <p>Pick a fit and a size. The timestamp is captured at checkout, so your shirt remembers the actual moment you chose it.</p>
          <div className="details-grid">
            <div><span>fabric</span><strong>100% cotton</strong></div>
            <div><span>printing</span><strong>made to order</strong></div>
            <div><span>shipping</span><strong>free in the US</strong></div>
          </div>
        </div>
        <div className="config-card">
          <div className="config-topline"><span>your configuration</span><span className="config-id">dt / 001</span></div>
          <div className="choice-group">
            <div className="choice-label"><span>fit</span><small>how it hangs</small></div>
            <div className="choice-row" role="radiogroup" aria-label="Choose a fit">
              {styles.map((option) => (
                <button key={option.id} className={`choice-button${style === option.id ? " selected" : ""}`} onClick={() => setStyle(option.id)} role="radio" aria-checked={style === option.id}>
                  <span>{option.label}</span><small>{option.note}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="choice-group size-group">
            <div className="choice-label"><span>size</span><small>the usual suspects</small></div>
            <div className="size-row" role="radiogroup" aria-label="Choose a size">
              {sizes.map((option) => <button key={option} className={`size-button${size === option ? " selected" : ""}`} onClick={() => setSize(option)} role="radio" aria-checked={size === option}>{option}</button>)}
            </div>
          </div>
          <div className="config-divider" />
          <div className="config-total"><div><span>the datetime tee</span><small>one tiny time capsule</small></div><strong>$22.50</strong></div>
          <button className="purchase-button" onClick={handlePurchase} disabled={status === "loading"}>
            <span>{status === "loading" ? "opening the time machine…" : "make it mine"}</span><span aria-hidden="true">→</span>
          </button>
          <div className="checkout-note"><span>↳</span> secure checkout · no account needed</div>
          {notice && <div className={`checkout-notice ${status === "error" ? "is-error" : ""}`} role="status">{notice}</div>}
        </div>
      </section>

      <section className="story shell" id="story">
        <div className="story-number">02</div>
        <div className="story-content">
          <p className="eyebrow"><span>the philosophy</span><span className="eyebrow-line" /></p>
          <h2>Proof that you<br /><em>were here.</em></h2>
          <p className="story-lede">There are plenty of ways to remember a day. This is ours: a timestamp, screen-printed in soft white ink, in the place it can be seen from across the room.</p>
          <p className="story-lede">It is intentionally specific. The slightly weird millisecond. The timezone you forgot you were in. The little proof that a passing second can still belong to you.</p>
          <Arrow>read the tiny manifesto</Arrow>
        </div>
        <div className="story-card">
          <span className="card-sticker">the good part</span>
          <span className="card-big">now</span>
          <span className="card-small">is the only<br />time we have.</span>
          <span className="card-scribble">✳</span>
        </div>
      </section>

      <section className="notes shell">
        <div className="notes-heading"><p className="eyebrow"><span>03 / notes from the present</span><span className="eyebrow-line" /></p><p>For the people who save receipts, write down dreams, and call back.</p></div>
        <div className="note-grid">
          <article><span className="note-icon">✳</span><h3>for the sentimental</h3><p>Wear it on the anniversary, the first day, or a Tuesday that unexpectedly turned out okay.</p></article>
          <article><span className="note-icon">↯</span><h3>for the punctual</h3><p>Finally, a shirt that gets the exact time right. Right down to the last little wobble.</p></article>
          <article><span className="note-icon">⌁</span><h3>for the impossible to explain</h3><p>When somebody asks, say “it’s a long story.” Technically, it is only 24 characters long.</p></article>
        </div>
      </section>

      <footer className="footer shell"><a className="wordmark" href="#top">datetime<span>.</span>store</a><span>made for now, wherever you are · {longStamp}</span><a href="#make-it-mine">get the shirt <span aria-hidden="true">↗</span></a></footer>
    </main>
  );
}
