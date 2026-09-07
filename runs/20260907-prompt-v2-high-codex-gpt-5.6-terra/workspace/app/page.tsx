"use client";

import { FormEvent, useState } from "react";

const shirts = [
  { id: "moon-map", name: "Moon Map", line: "For the trail you take by feel.", art: "/prints/moon-map.svg", price: 32 },
  { id: "moth-signal", name: "Moth Signal", line: "Drawn to the good kind of glow.", art: "/prints/moth-signal.svg", price: 32 },
  { id: "last-light", name: "Last Light", line: "Leave no trace. Keep the story.", art: "/prints/last-light.svg", price: 32 }
];

type Shirt = typeof shirts[number];
type FormData = { name: string; email: string; line1: string; city: string; state: string; postalCode: string; country: string; size: string };
const initialForm: FormData = { name: "", email: "", line1: "", city: "", state: "", postalCode: "", country: "US", size: "m" };

function ShirtMockup({ shirt }: { shirt: Shirt }) {
  return <div className="mockup" aria-label={`${shirt.name} t-shirt preview`}>
    <div className="shirt-body"><div className="neck" /><img src={shirt.art} alt="" /></div>
  </div>;
}

export default function Home() {
  const [selected, setSelected] = useState<Shirt | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "success" | "error"; message: string }>({ kind: "idle", message: "" });

  const checkout = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setStatus({ kind: "sending", message: "Sending your sandbox order…" });
    try {
      const result = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selected.id, ...form }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "We couldn't create that order.");
      setStatus({ kind: "success", message: `Sandbox order ${data.orderId} created. Nothing will be printed or charged.` });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Please try again." });
    }
  };

  return <main>
    <nav><a className="brand" href="#top">NIGHT<br />HIKE CLUB</a><span>SMALL RUN / ALWAYS AFTER DARK</span><a href="#shop">SHOP THE DROP ↓</a></nav>
    <section id="top" className="hero">
      <div className="hero-copy"><p className="eyebrow">EST. AFTER SUNSET</p><h1>Meet me<br /><i>where the</i><br />trail goes quiet.</h1><p className="lede">Graphic tees for night walkers, campfire lingerers, and anyone who has ever chosen the longer way home.</p><a className="button" href="#shop">Find your signal <b>→</b></a></div>
      <div className="hero-art" aria-hidden="true"><div className="moon" /><div className="ridge ridge-one" /><div className="ridge ridge-two" /><div className="stars">✦　·　✦<br />　·　　✦</div><div className="hero-stamp">NOCTURNAL<br />FIELD NOTES</div></div>
    </section>
    <section className="manifesto"><span>✦</span><p>BUILT FOR THE HOURS WHEN THE WORLD STOPS PERFORMING.</p><span>✦</span></section>
    <section id="shop" className="shop"><div className="section-top"><div><p className="eyebrow">DROP 01 / 2026</p><h2>Wear the wayfinder.</h2></div><p>Printed to order on a soft, black Bella + Canvas 3003 tee. US shipping in this first run.</p></div>
      <div className="grid">{shirts.map((shirt, index) => <article className="card" key={shirt.id}><div className={`product-art art-${index}`}><ShirtMockup shirt={shirt} /><span className="edition">01/{String(index + 1).padStart(2, "0")}</span></div><div className="card-info"><div><h3>{shirt.name}</h3><p>{shirt.line}</p></div><span>${shirt.price}</span></div><button onClick={() => { setSelected(shirt); setStatus({ kind: "idle", message: "" }); }}>{"Choose size →"}</button></article>)}</div>
    </section>
    <section className="field-note"><div><p className="eyebrow">FROM THE TRAIL LOG</p><h2>Less noise.<br /><i>More night.</i></h2></div><p>Night Hike Club is a tiny wearable field journal. Each drop starts with a place, a strange sky, and a reason to stay out a little later.</p><span>✦</span></section>
    <footer><a className="brand" href="#top">NIGHT<br />HIKE CLUB</a><p>GOOD AFTER DARK.<br />BETTER OUTSIDE.</p><span>© 2026 NHC</span></footer>

    {selected && <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><div className="checkout"><button className="close" onClick={() => setSelected(null)} aria-label="Close checkout">×</button><div className="checkout-header"><p className="eyebrow">SANDBOX CHECKOUT</p><h2 id="checkout-title">{selected.name}</h2><p>${selected.price} · black tee · US shipping</p></div>{status.kind === "success" ? <div className="result success"><strong>You're on the map.</strong><p>{status.message}</p><button className="button" onClick={() => setSelected(null)}>Back to the drop</button></div> : <form onSubmit={checkout}><div className="form-row"><label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label></div><label>Street address<input required value={form.line1} onChange={e => setForm({ ...form, line1: e.target.value })} /></label><div className="form-row"><label>City<input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label><label>State<input required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></label></div><div className="form-row"><label>ZIP code<input required value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></label><label>Size<select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}><option value="s">S</option><option value="m">M</option><option value="l">L</option><option value="xl">XL</option><option value="2xl">2XL</option></select></label></div>{status.kind === "error" && <p className="error">{status.message}</p>}<button className="button submit" disabled={status.kind === "sending"}>{status.kind === "sending" ? "Sending…" : "Place sandbox order →"}</button><p className="fine-print">Sandbox only: this sends a real test request to Prodigi but never charges, prints, or ships.</p></form>}</div></div>}
  </main>;
}
