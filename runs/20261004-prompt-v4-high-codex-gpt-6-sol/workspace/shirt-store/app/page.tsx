"use client";
import { useEffect, useMemo, useState } from "react";
import { makeArtwork } from "../lib/artwork";
const sizes = ["S", "M", "L", "XL", "2XL"];
export default function Home() {
  const [place, setPlace] = useState("Big Sur, California");
  const [date, setDate] = useState("2024-08-17");
  const [note, setNote] = useState("Where we felt infinite");
  const [size, setSize] = useState("M");
  const [busy, setBusy] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [error, setError] = useState("");
  const art = useMemo(() => makeArtwork({ place, date, note }), [place, date, note]);
  useEffect(() => { fetch("/api/store-status").then(r => r.json()).then(value => setCheckoutReady(!!(value as { checkoutReady?: boolean }).checkoutReady)).catch(() => setCheckoutReady(false)); }, []);
  async function checkout() {
    setError("");
    if (!place.trim() || !date || !note.trim()) { setError("Add a place, date, and short line to make your shirt."); return; }
    setBusy(true);
    try {
      const blob = await renderPrint(art);
      const form = new FormData();
      for (const [key, value] of Object.entries({ place: place.trim(), date, note: note.trim(), size })) form.append(key, value);
      form.append("art", blob, "artwork.png");
      const response = await fetch("/api/checkout", { method: "POST", body: form });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout could not start. Please try again.");
      window.location.href = result.url;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not start. Please try again."); setBusy(false); }
  }
  return <main>
    <header className="topbar"><a className="brand" href="/" aria-label="Elsewhere, Always home"><span className="brand-mark">◎</span> ELSEWHERE<span className="brand-comma">,</span> ALWAYS</a><span className="topbar-note">Made for the places that made you.</span><a className="header-link" href="#studio">Create yours <span aria-hidden="true">↗</span></a></header>
    <section className="intro"><div className="eyebrow"><span className="eyebrow-line" /> THE WEARABLE MEMORY STUDIO / 001</div><h1>Some places<br /><em>stay with you.</em></h1><div className="intro-bottom"><p>Turn the place, date, and words that mean something to you into a one of one shirt. Every contour is drawn from your story.</p><div className="intro-aside"><span>✳</span> Designed by you.<br />Printed just for you.</div></div></section>
    <section id="studio" className="studio" aria-label="Customize your shirt"><div className="studio-preview"><div className="preview-heading"><span>01 / YOUR SHIRT</span><span>LIVE PREVIEW <span className="live-dot" /></span></div><div className="shirt-stage"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><svg className="shirt-shape" viewBox="0 0 720 780" role="img" aria-label="Navy blue t-shirt preview"><defs><linearGradient id="shirtFill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#263a49"/><stop offset=".45" stopColor="#182a38"/><stop offset="1" stopColor="#0b1c29"/></linearGradient><filter id="shirtShadow"><feDropShadow dx="0" dy="22" stdDeviation="20" floodColor="#172a34" floodOpacity=".22"/></filter></defs><path filter="url(#shirtShadow)" fill="url(#shirtFill)" stroke="#081d2a" strokeWidth="3" d="M258 82 202 102 102 133 40 309 145 356 207 245 208 706 Q360 734 512 706 L513 245 575 356 680 309 618 133 518 102 462 82 Q440 131 360 132 Q280 131 258 82Z"/><path fill="none" stroke="#546674" strokeOpacity=".5" strokeWidth="3" d="M258 82Q280 153 360 153Q440 153 462 82M208 245L145 356M512 245L575 356"/><path fill="#112330" stroke="#445867" strokeWidth="2" d="M278 91Q360 185 442 91Q416 144 360 145Q304 144 278 91Z"/></svg><div className="shirt-art" aria-label="Personalized front print preview" dangerouslySetInnerHTML={{ __html: art }}/><div className="stage-caption">NAVY / UNISEX SOFTSTYLE / FRONT PRINT</div></div><div className="preview-footer"><span>YOUR DETAILS BECOME THE DESIGN</span><span>PRINTED ON DEMAND</span></div></div>
    <div className="studio-controls"><div className="controls-heading"><span>02 / MAKE IT YOURS</span><span className="tiny-flower">✳</span></div><h2>Wear your<br /><em>somewhere.</em></h2><p className="controls-subtitle">A location, a moment, a few words. We turn them into your own contour artwork.</p><div className="field-group"><label htmlFor="place">THE PLACE <span>01</span></label><input id="place" value={place} maxLength={28} onChange={e => setPlace(e.target.value)} placeholder="Big Sur, California" autoComplete="off"/><small>The city, coast, trail, or corner you carry with you.</small></div><div className="two-fields"><div className="field-group"><label htmlFor="date">THE DATE <span>02</span></label><input id="date" type="date" value={date} onChange={e => setDate(e.target.value)}/></div><div className="field-group"><label htmlFor="size">YOUR SIZE <span>03</span></label><select id="size" value={size} onChange={e => setSize(e.target.value)}>{sizes.map(s => <option key={s}>{s}</option>)}</select></div></div><div className="field-group"><label htmlFor="note">YOUR WORDS <span>04</span></label><input id="note" value={note} maxLength={40} onChange={e => setNote(e.target.value)} placeholder="Where we felt infinite" autoComplete="off"/><small>Up to 40 characters. A feeling, a promise, an inside joke.</small></div><div className="order-summary"><div><strong>Your one of one shirt</strong><span>Softstyle cotton · navy · front print</span></div><strong>$42</strong></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="checkout-button" onClick={checkout} disabled={busy || !checkoutReady}>{!checkoutReady ? "Checkout being connected" : busy ? "Preparing your artwork…" : "Make it mine — $42"}<span aria-hidden="true">↗</span></button><p className="checkout-note">{checkoutReady ? "Secure checkout · US shipping included · Made after you order" : "Preview your design now. Orders open after payment setup."}</p></div></section>
    <section className="story-strip"><span>NO TWO STORIES ALIKE</span><p>For your first trip together. The town you call home. The day everything changed.</p><span>YOUR MEMORY, MADE TANGIBLE ✳</span></section><section className="details"><div><span className="detail-icon">✳</span><h3>Actually personal</h3><p>Your details shape every line of your print. This is made for your moment, not pulled from a shelf.</p></div><div><span className="detail-icon">◎</span><h3>Made to be worn</h3><p>Soft, ring spun Gildan cotton with a considered front print that sits naturally on the shirt.</p></div><div><span className="detail-icon">↗</span><h3>Printed when ordered</h3><p>Direct to garment printing keeps the detail crisp and avoids making shirts nobody asked for.</p></div></section><footer><span>ELSEWHERE, ALWAYS © 2026</span><span>Carry the place. Keep the feeling.</span><span>US orders only for now</span></footer>
  </main>;
}
async function renderPrint(svg: string): Promise<Blob> {
  const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Could not render artwork")); img.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = 3600; canvas.height = 4400;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Your browser could not prepare the print file.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not prepare print file")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}
