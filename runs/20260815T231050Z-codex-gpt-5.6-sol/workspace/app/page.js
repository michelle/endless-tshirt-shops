"use client";

import { useEffect, useRef, useState } from "react";

const format = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "long" });

function Shirt({ timestamp, style, paused }) {
  const silhouette = style === "fitted"
    ? "M115 25c-20 5-36 12-51 22L14 95l45 29 20-23c7 38 6 82-7 134 42 14 84 14 126 0-13-52-14-96-7-134l20 23 45-29-50-48c-15-10-31-17-51-22-5 22-46 22-51 0Z"
    : "M115 25c-26 2-43 9-56 19L9 96l45 34 27-29v138c42 12 82 12 124 0V101l27 29 45-34-50-52c-13-10-30-17-56-19-9 31-47 31-56 0Z";
  return (
    <div className={`shirt-stage ${paused ? "paused" : ""}`} aria-label={`Black ${style} t-shirt preview printed with ${timestamp}`}>
      <svg viewBox="0 0 286 278" role="img">
        <defs><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="12" floodOpacity=".16"/></filter></defs>
        <path d={silhouette} fill="#111" filter="url(#shadow)" />
        <path d={silhouette} fill="url(#shirt-light)" opacity=".2" />
        <defs><linearGradient id="shirt-light" x1="0" x2="1"><stop stopColor="#fff" stopOpacity=".1"/><stop offset=".5" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#fff" stopOpacity=".12"/></linearGradient></defs>
        <text x="143" y="112" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" letterSpacing=".5">{timestamp}</text>
      </svg>
      <div className="price"><s>$30</s><strong>$22.50</strong><span>free US shipping</span></div>
    </div>
  );
}

export default function Home() {
  const [style, setStyle] = useState("fitted");
  const [size, setSize] = useState("M");
  const [timestamp, setTimestamp] = useState(() => Date.now());
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef();

  useEffect(() => {
    if (!frozen) timer.current = setInterval(() => setTimestamp(Date.now()), 43);
    return () => clearInterval(timer.current);
  }, [frozen]);

  async function checkout() {
    setFrozen(true); setLoading(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style, size, timestamp }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e) { setError(e.message); setLoading(false); setFrozen(false); }
  }

  return (
    <main>
      <nav><a className="brand" href="/">datetime.store</a><span className="nav-note">made one millisecond at a time</span></nav>
      <section className="hero">
        <div className="intro">
          <p className="eyebrow">A tiny edition of exactly one</p>
          <h1>This moment.<br/><em>On a shirt.</em></h1>
          <p className="lede">A beautifully simple black tee printed with the exact Unix millisecond you clicked buy. No two are quite the same.</p>
          <div className="moment"><span>your moment</span><strong>{timestamp}</strong><small>{format.format(new Date(timestamp))}</small></div>
          <p className="freeze-note"><i className={frozen ? "dot stopped" : "dot"}/>{frozen ? "Moment captured" : "Live — it stops when you continue"}</p>
        </div>
        <Shirt timestamp={timestamp} style={style} paused={frozen}/>
        <div className="order-card">
          <div className="step"><div className="step-title"><span>01</span><strong>Choose your cut</strong></div><div className="choices">{[["fitted","Fitted"],["unisex","Unisex"]].map(([v,l]) => <button key={v} className={style===v?"choice active":"choice"} onClick={()=>setStyle(v)}><b>{l}</b><small>{v==="fitted"?"Closer silhouette":"Classic straight cut"}</small></button>)}</div></div>
          <div className="step"><div className="step-title"><span>02</span><strong>Pick a size</strong></div><div className="sizes">{["S","M","L","XL"].map(v => <button key={v} className={size===v?"size active":"size"} onClick={()=>setSize(v)}>{v}</button>)}</div></div>
          <div className="summary"><span>{style === "fitted" ? "Fitted" : "Unisex"} / {size} / Black</span><strong>$22.50</strong></div>
          <button className="buy" onClick={checkout} disabled={loading}>{loading ? "Capturing your moment…" : "Capture this moment →"}</button>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="secure">Secure checkout by Stripe · Printed on demand in the USA</p>
        </div>
      </section>
      <section className="how"><p className="eyebrow">How it works</p><div className="how-grid"><div><span>01</span><h2>Watch time move</h2><p>Your timestamp updates in real time, right down to the millisecond.</p></div><div><span>02</span><h2>Make it yours</h2><p>Continue to checkout and that instant is permanently captured.</p></div><div><span>03</span><h2>We print & ship</h2><p>Your one-of-one shirt is made on demand and shipped to your door.</p></div></div></section>
      <footer><a className="brand" href="/">datetime.store</a><p>A small experiment in time, type, and cotton.</p><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
