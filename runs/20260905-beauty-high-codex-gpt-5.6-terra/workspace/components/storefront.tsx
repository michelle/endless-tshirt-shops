"use client";

import { useEffect, useMemo, useState } from "react";

type Moment = { iso: string; ms: string; tz: string };
const colors = [{ value: "black", label: "Night ink", swatch: "#202124" }, { value: "navy blue", label: "Deep blue", swatch: "#25324a" }, { value: "white", label: "Cloud", swatch: "#f5f1e9" }, { value: "natural", label: "Oat", swatch: "#ded4be" }];

function captureNow(): Moment {
  const now = new Date();
  return { iso: now.toISOString(), ms: String(now.getTime()), tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" };
}

export default function Storefront() {
  const [moment, setMoment] = useState<Moment | null>(null);
  const [now, setNow] = useState(() => captureNow());
  const [size, setSize] = useState("m");
  const [color, setColor] = useState("black");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const liveMoment = useMemo(() => moment || now, [moment, now]);

  useEffect(() => {
    if (moment) return;
    const tick = window.setInterval(() => setNow(captureNow()), 37);
    return () => window.clearInterval(tick);
  }, [moment]);

  const visibleTime = liveMoment.ms;
  const pretty = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "medium", timeZone: liveMoment.tz }).format(new Date(liveMoment.iso));

  async function checkout() {
    const chosenMoment = moment || captureNow();
    setMoment(chosenMoment);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moment: chosenMoment, size, color }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not start.");
      window.location.assign(data.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something got lost in the time stream."); setBusy(false); }
  }

  return <main>
    <div className="grain" aria-hidden="true" />
    <header className="site-header"><a className="wordmark" href="/">datetime<span>.</span>store</a><p>est. right now</p></header>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">a very small time machine</p><h1>Wear the<br/><em>exact</em> moment.</h1><p className="intro">We turn a passing instant into a soft, limited-to-one t-shirt. No reruns. No take-backs. Just now, made tangible.</p><div className="micro-facts"><span>✦ printed on demand</span><span>✦ free standard shipping</span><span>✦ one of one</span></div></div>
      <div className={`shirt-stage ${color.replace(" ", "-")}`}>
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="star star-one">✦</div><div className="star star-two">✳</div>
        <div className="tee-shadow"/><div className="tee"><div className="collar"/><div className="sleeve sleeve-left"/><div className="sleeve sleeve-right"/><div className="tee-body"><div className="print"><span className="print-kicker">YOU ARE HERE</span><strong>{visibleTime}</strong><i/><span className="print-date">{pretty.toUpperCase()}</span><span className="print-zone">{liveMoment.tz.toUpperCase()}</span><small>• A SMALL, TRUE RECORD •</small></div></div></div>
        <p className="live-pill"><span/> {moment ? "moment captured" : "live timestamp"}</p>
      </div>
    </section>
    <section className="studio" aria-label="Design your timestamp shirt">
      <div className="studio-intro"><p className="eyebrow">the little details</p><h2>Choose a vessel<br/>for this <em>now.</em></h2><p>Your timestamp is frozen at checkout and printed in soft ivory ink on a Bella+Canvas 3001 tee.</p></div>
      <div className="controls">
        <fieldset><legend>01 — shirt color</legend><div className="swatches">{colors.map((item) => <button key={item.value} className={color === item.value ? "swatch selected" : "swatch"} onClick={() => setColor(item.value)} aria-label={item.label} aria-pressed={color === item.value}><span style={{ background: item.swatch }}/><b>{item.label}</b></button>)}</div></fieldset>
        <fieldset><legend>02 — your usual size</legend><div className="sizes">{["s", "m", "l", "xl", "2xl"].map((item) => <button key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)} aria-pressed={size === item}>{item.toUpperCase()}</button>)}</div><p className="fit-note">Unisex classic fit. Between sizes? Size up for a roomier little universe.</p></fieldset>
        <div className="moment-card"><span className="orbit-dot"/><p>your edition</p><strong>{moment ? "sealed in time" : "unsealed"}</strong><code>{visibleTime}</code><button className="quiet-button" onClick={() => setMoment(captureNow())}>{moment ? "Capture a new now ↗" : "Capture this moment ↗"}</button></div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="buy-button" onClick={checkout} disabled={busy}>{busy ? "opening the time portal…" : "Make it mine — $36"}<span>→</span></button><p className="checkout-note">Secure checkout · printed only after you say so</p>
      </div>
    </section>
    <section className="manifesto"><p className="eyebrow">why on earth?</p><h2>Because the present deserves a souvenir.</h2><p>Every shirt is a receipt from the universe. Yours is made only once, after you choose it, by a print partner near its final home.</p><div className="steps"><article><b>01</b><h3>Catch</h3><p>Watch the clock make a tiny, private history.</p></article><article><b>02</b><h3>Seal</h3><p>At checkout, we lock every millisecond into your edition.</p></article><article><b>03</b><h3>Wear</h3><p>Prodigi prints and sends your exact little record.</p></article></div></section>
    <footer><a className="wordmark" href="/">datetime<span>.</span>store</a><p>made with unreasonable affection for the present</p><p>© {new Date().getFullYear()} · no seconds were harmed</p></footer>
  </main>;
}
