"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./page.module.css";

const badges = [
  { id: "spark", icon: "✦", name: "Bright spark" },
  { id: "sun", icon: "☀", name: "Fresh start" },
  { id: "rocket", icon: "↗", name: "Onward" },
  { id: "wave", icon: "〰", name: "Made a little room" },
];
const colors = [
  { id: "cream", label: "Soft cream", swatch: "#f4eddd", ink: "#17263c" },
  { id: "black", label: "Midnight", swatch: "#202431", ink: "#f7d63a" },
  { id: "white", label: "White", swatch: "#ffffff", ink: "#f05245" },
];

export default function Home() {
  const [moment, setMoment] = useState("I made the call");
  const [name, setName] = useState("MAYA");
  const [badge, setBadge] = useState("spark");
  const [color, setColor] = useState("cream");
  const [size, setSize] = useState("m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const activeColor = useMemo(() => colors.find((item) => item.id === color) ?? colors[0], [color]);
  const activeBadge = badges.find((item) => item.id === badge) ?? badges[0];

  async function checkout(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moment, name, badge, color, size }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start checkout.");
      window.location.assign(result.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start checkout."); setLoading(false); }
  }

  return <main>
    <nav className={styles.nav} aria-label="Main navigation"><a className={styles.wordmark} href="#maker"><span>tiny</span> triumphs</a><a href="#maker">Make yours</a><span className={styles.navNote}>DTG printed · made one at a time</span></nav>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}>The very good, very small things</p><h1>Wear the win<br /><em>only you</em> noticed.</h1><p className={styles.intro}>Your tiny triumph, turned into a one-of-one tee. Made to order with water-based DTG inks on a soft Bella + Canvas 3001.</p><a className={styles.arrowLink} href="#maker">Make a shirt <span>↓</span></a></div>
      <div className={styles.heroArt} aria-label="A shirt celebrating a small win"><div className={styles.heroBurst}>✦</div><svg viewBox="0 0 440 480" role="img" aria-hidden="true"><path d="M126 68 174 35h92l48 33 80 49-49 107-44-27v243H139V197l-44 27-49-107 80-49Z" fill="#f05245" /><path d="M174 35c4 58 88 58 92 0" fill="none" stroke="#f7e7ce" strokeWidth="11" /><text x="220" y="235" textAnchor="middle" fill="#f8e7ce" fontFamily="Arial Black, sans-serif" fontSize="28">I DID THE</text><text x="220" y="282" textAnchor="middle" fill="#f8e7ce" fontFamily="Georgia, serif" fontStyle="italic" fontSize="43">thing</text><circle cx="220" cy="330" r="28" fill="#f7d63a" /><path d="m220 310 6 15 16 1-12 10 4 16-14-8-14 8 4-16-12-10 16-1z" fill="#17263c" /></svg><p>Small wins deserve evidence.</p></div>
    </section>
    <section className={styles.maker} id="maker"><header><p className={styles.eyebrow}>The personal edition</p><h2>Make it unmistakably yours.</h2><p>Every line is printed just for you. Keep it short, honest, and a little bit proud.</p></header>
      <form className={styles.studio} onSubmit={checkout}><div className={styles.controls}>
        <label><span>01 / What did you do?</span><input maxLength={42} value={moment} onChange={(e) => setMoment(e.target.value)} placeholder="I made the call" required /></label>
        <label><span>02 / Whose win is it?</span><input maxLength={18} value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="YOUR NAME" required /></label>
        <fieldset><legend>03 / Pick your tiny trophy</legend><div className={styles.badges}>{badges.map((item) => <button type="button" onClick={() => setBadge(item.id)} className={badge === item.id ? styles.selected : ""} key={item.id} aria-pressed={badge === item.id}><b>{item.icon}</b><span>{item.name}</span></button>)}</div></fieldset>
        <fieldset><legend>04 / Shirt color</legend><div className={styles.colors}>{colors.map((item) => <button type="button" key={item.id} onClick={() => setColor(item.id)} aria-label={item.label} aria-pressed={color === item.id} className={color === item.id ? styles.selected : ""}><i style={{ backgroundColor: item.swatch }} /></button>)}</div></fieldset>
        <label className={styles.sizeSelect}><span>05 / Size</span><select value={size} onChange={(e) => setSize(e.target.value)}><option value="xs">XS</option><option value="s">S</option><option value="m">M</option><option value="l">L</option><option value="xl">XL</option><option value="2xl">2XL</option><option value="3xl">3XL</option></select></label>
      </div><aside className={styles.previewPanel}><div className={styles.previewLabel}><span>LIVE PREVIEW</span><span>FRONT PRINT</span></div><div className={styles.shirt} style={{ "--shirt": activeColor.swatch, "--ink": activeColor.ink } as React.CSSProperties}><svg viewBox="0 0 440 510" aria-label="Your personalized shirt preview" role="img"><path d="M130 68 174 38h92l44 30 88 53-52 112-45-28v260H139V205l-45 28-52-112 88-53Z" fill="var(--shirt)" stroke="#1a263d" strokeWidth="4" /><path d="M174 38c4 59 88 59 92 0" fill="none" stroke="#1a263d" strokeWidth="8" /><text x="220" y="240" textAnchor="middle" fill="var(--ink)" fontFamily="Arial Black, sans-serif" fontSize="18" letterSpacing="2">TINY TRIUMPH</text><text x="220" y="280" textAnchor="middle" fill="var(--ink)" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="bold" fontSize="30">{moment || "Your tiny win"}</text><text x="220" y="321" textAnchor="middle" fill="var(--ink)" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="15" letterSpacing="3">{name || "YOUR NAME"}</text><circle cx="220" cy="365" r="28" fill="var(--ink)" /><text x="220" y="376" textAnchor="middle" fill="var(--shirt)" fontFamily="Arial Black, sans-serif" fontSize="32">{activeBadge.icon}</text></svg></div><div className={styles.summary}><div><strong>Personal edition tee</strong><span>Bella + Canvas 3001 · {activeColor.label}</span></div><strong>$32</strong></div><button className={styles.buy} disabled={loading}>{loading ? "Opening checkout…" : "Continue to secure checkout"} <span>→</span></button>{error && <p className={styles.error} role="alert">{error}</p>}<p className={styles.fulfillment}>Printed after payment · US shipping $5.99 · typically 4–8 business days</p></aside></form>
    </section>
    <section className={styles.promise}><p className={styles.eyebrow}>A little occasion, properly observed</p><div><h2>Not just a shirt.<br />A receipt for <em>showing up.</em></h2><p>Custom DTG printing gives your inside joke, brave little act, or finally-did-it moment the full-color treatment it deserves.</p></div><div className={styles.pills}><span>Full-color DTG</span><span>Soft 100% cotton</span><span>Printed for you</span></div></section>
    <footer className={styles.footer}><a className={styles.wordmark} href="#maker"><span>tiny</span> triumphs</a><p>Wear the evidence.</p><p>Made one at a time with Prodigi.</p></footer>
  </main>;
}
