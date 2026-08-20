import { useEffect, useMemo, useState } from "react";

const cuts = { fitted: "Fitted", unisex: "Unisex" };
const sizes = ["S", "M", "L", "XL"];

function Shirt({ cut, timestamp }) {
  const path = cut === "fitted"
    ? "M79.3 15.1C77.7 13.5 63.2 9 63.2 9s-4.3 8.7-11.7 8.7S39.9 9 39.9 9s-15.4 4.9-16.5 6.1C22.3 16.3 9.7 32.1 9.7 32.1l10.1 8.4 6.6-5.5s14.4 24 1.4 58.9c0 0 43.5 10.8 47.4 0-9.7-43.3 1.4-58.6 1.4-58.6l6.3 5.2 9.4-11.1S81 16.8 79.3 15.1Z"
    : "M79.3 6.1C77.7 4.5 63.2 4 63.2 4S53.4 17.7 51.5 17.7C49.7 17.7 39.9 4 39.9 4S24.5 4.9 23.4 6.1C22.3 7.2.6 31 .6 31l16.1 12 9.7-8.1 1.4 58.9s43.5 10.7 47.4 0l1.4-58.6 9.3 7.8L100 31S80.9 7.8 79.3 6.1Z";
  return <div className="shirt-wrap" aria-label={`Black ${cuts[cut]} shirt with timestamp ${timestamp}`}>
    <div className="timestamp">{timestamp}</div>
    <svg viewBox="0 0 100 125" role="img"><path d={path} /></svg>
    <div className="price"><s>$30.00</s>&nbsp; $22.50</div>
  </div>;
}

export default function Home() {
  const [cut, setCut] = useState("fitted");
  const [size, setSize] = useState("M");
  const [timestamp, setTimestamp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const t = setInterval(() => setTimestamp(String(Date.now())), 40); setTimestamp(String(Date.now())); return () => clearInterval(t); }, []);
  const fulfillment = useMemo(() => ({ cut, size, timestamp }), [cut, size, timestamp]);
  async function checkout() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(fulfillment) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to begin checkout.");
      window.location.assign(data.url);
    } catch (e) { setError(e.message); setLoading(false); }
  }
  return <main>
    <header><a href="/" className="wordmark">datetime.store</a><p>we sell a t-shirt with the current datetime. <span aria-hidden="true">◷</span></p></header>
    <section className="product"><div className="visual"><Shirt cut={cut} timestamp={timestamp} /><p className="caption">Your shirt is printed with the exact moment you order it.</p></div>
      <div className="order" aria-label="Configure your shirt"><fieldset><legend>Choose a cut</legend><div className="options two">{Object.entries(cuts).map(([value,label]) => <label key={value}><input type="radio" name="cut" value={value} checked={cut===value} onChange={()=>setCut(value)} /><span>{label}</span></label>)}</div></fieldset>
      <fieldset><legend>Choose a size</legend><div className="options four">{sizes.map(value => <label key={value}><input type="radio" name="size" value={value} checked={size===value} onChange={()=>setSize(value)} /><span>{value}</span></label>)}</div></fieldset>
      <div className="summary"><span>One black {cuts[cut].toLowerCase()} tee</span><strong>$22.50</strong></div>
      {error && <p className="error" role="alert">{error}</p>}
      <button onClick={checkout} disabled={loading}>{loading ? "Preparing secure checkout…" : "Buy now"}<span aria-hidden="true"> →</span></button>
      <p className="fineprint">Secure checkout by Stripe. Shipping and taxes are calculated at checkout. Made to order.</p></div></section>
    <footer>© {new Date().getFullYear()} datetime.store · a small record of a passing moment</footer>
  </main>;
}
