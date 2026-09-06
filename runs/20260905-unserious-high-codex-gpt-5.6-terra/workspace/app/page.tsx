"use client";

import { useEffect, useMemo, useState } from "react";

const sizes = ["S", "M", "L", "XL"] as const;
type Fit = "classic" | "roomy";

function stamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3,
    hour12: false,
  }).format(date);
}

export default function Store() {
  const [now, setNow] = useState(() => new Date());
  const [fit, setFit] = useState<Fit>("classic");
  const [size, setSize] = useState<(typeof sizes)[number]>("M");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 43);
    return () => window.clearInterval(clock);
  }, []);

  const designTime = useMemo(() => now.toISOString(), [now]);
  const humanTime = stamp(now);

  async function checkout() {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designTime, fit, size }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout went somewhere strange.");
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A tiny checkout gremlin appeared.");
      setIsLoading(false);
    }
  }

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="datetime.store home">datetime.store</a>
        <p>tiny merch for enormous moments</p>
      </header>

      <section className="product" aria-label="Timestamp T-shirt">
        <div className="art-panel">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className={`shirt ${fit}`} aria-label={`Black ${fit} fit t-shirt preview`}>
            <div className="neck" />
            <div className="sleeve left" /><div className="sleeve right" />
            <div className="shirt-body">
              <span className="printed-label">THE INSTANT WAS</span>
              <strong className="printed-time">{humanTime}</strong>
              <span className="printed-label bottom">AND THEN IT WASN&apos;T.</span>
            </div>
          </div>
          <div className="live-pill"><i /> printing the present, live</div>
        </div>

        <div className="buy-panel">
          <div className="eyebrow">ONE SHIRT. ONE MOMENT.</div>
          <h1>The current<br /><em>datetime.</em></h1>
          <p className="intro">A black shirt with the exact moment you chose to make a shirt. It will never be this shirt again.</p>

          <div className="price-row"><span className="old-price">$30.00</span><span className="price">$22.50</span><span className="usd">USD</span></div>
          <p className="shipping">+ free standard shipping in the US</p>

          <fieldset>
            <legend>Fit <span>pick your vessel</span></legend>
            <div className="choice-grid">
              {([ ["classic", "Classic", "A regular tee."], ["roomy", "Roomy", "More room for time."] ] as const).map(([value, label, note]) => (
                <button key={value} type="button" onClick={() => setFit(value)} className={fit === value ? "choice active" : "choice"} aria-pressed={fit === value}>
                  <b>{label}</b><small>{note}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Size <span>adult human sizing</span></legend>
            <div className="size-grid">
              {sizes.map((value) => <button type="button" key={value} onClick={() => setSize(value)} className={size === value ? "size active" : "size"} aria-pressed={size === value}>{value}</button>)}
            </div>
          </fieldset>

          <button className="buy" onClick={checkout} disabled={isLoading}>
            {isLoading ? "opening the time portal…" : "freeze this moment — $22.50"}<span aria-hidden>→</span>
          </button>
          {message && <p className="error" role="alert">{message}</p>}
          <p className="fine-print">Printed to order. Your timestamp is locked when you hit the button. No take-backs, apparently.</p>
        </div>
      </section>

      <footer><span>© {now.getFullYear()} datetime.store</span><span>made with approximately one clock</span><span>no time machines accepted</span></footer>
    </main>
  );
}
