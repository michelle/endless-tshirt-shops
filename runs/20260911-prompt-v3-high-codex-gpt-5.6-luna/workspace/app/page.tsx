"use client";

import { useMemo, useState } from "react";
import { ACCENTS, DEFAULT_DESIGN, getVibe, SHIRT_COLORS, SIZES, VIBES, artworkSvg, type Design } from "../lib/design";

export default function Home() {
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const vibe = getVibe(design.vibe);
  const shirt = SHIRT_COLORS.find((item) => item.value === design.shirtColor) ?? SHIRT_COLORS[0];
  const total = (48 * design.quantity).toFixed(2);
  const previewSvg = useMemo(() => artworkSvg(design), [design]);

  function update(patch: Partial<Design>) {
    setDesign((current) => ({ ...current, ...patch }));
    setNotice("");
  }

  async function startCheckout() {
    setCheckoutState("loading");
    setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design, email, shippingName }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Could not start checkout.");
      window.location.href = result.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout.");
      setCheckoutState("error");
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Patchwork home"><span className="mark">+</span>PATCHWORK</a>
        <div className="topbar-meta"><span>DTG / MADE FOR ONE</span><span className="topbar-rule" /><span>DROP 001 · OPEN</span></div>
        <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${design.quantity} item${design.quantity > 1 ? "s" : ""}`}><span>BAG</span><span className="cart-count">{design.quantity}</span></button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> FIELD NOTE 001 / THE SIGNAL TEE</p>
          <h1>Wear the signal<br /><em>only you can make.</em></h1>
          <p className="hero-lede">A one-of-one graphic generated from your current frequency. Type a name, choose a mood, leave a note. We print the result directly onto a heavyweight cotton tee.</p>
          <a className="button button-dark" href="#customize">Build yours <span>↘</span></a>
          <div className="hero-proof"><span>01</span><span>YOUR INPUT</span><span className="line" /><span>02</span><span>DTG PRINT</span><span className="line" /><span>03</span><span>AT YOUR DOOR</span></div>
        </div>
        <div className="hero-art" aria-label="Animated example signal map">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <div className="hero-star star-one">✳</div><div className="hero-star star-two">✦</div><div className="hero-star star-three">+</div>
          <div className="hero-tee"><TeeShirt color="#e8dfd0" design={design} previewSvg={previewSvg} /></div>
          <span className="hero-art-label label-a">YOUR FREQUENCY<br /><b>IS THE DESIGN</b></span>
          <span className="hero-art-label label-b">100% COTTON<br /><b>ONE OF ONE</b></span>
        </div>
      </section>

      <div className="ticker" aria-hidden="true"><span>NO TWO SIGNALS ARE ALIKE</span><i>✳</i><span>NO TWO SIGNALS ARE ALIKE</span><i>✳</i><span>NO TWO SIGNALS ARE ALIKE</span><i>✳</i></div>

      <section className="story-grid">
        <div className="section-index">[ 001 — THE IDEA ]</div>
        <div className="story-heading"><h2>Clothes with<br /><span>a point of view.</span></h2></div>
        <div className="story-copy"><p>Patchwork is a tiny print studio for big inner worlds. We turn the words you are carrying around into a visual artifact you can keep close.</p><p>Every design is plotted, not picked. Every tee is printed after you order, so your signal never gets diluted into a mass drop.</p><a className="text-link" href="#customize">Make a signal <span>↗</span></a></div>
      </section>

      <section className="customizer" id="customize">
        <div className="customizer-intro"><p className="eyebrow">[ 002 — THE CUSTOMIZER ]</p><h2>Give it<br /><em>a frequency.</em></h2><p>Four small choices. One very personal shirt.</p></div>
        <div className="builder">
          <div className="builder-step"><div className="step-number">01</div><div className="step-content"><label htmlFor="name">Name your signal <span>your name, alias, or alter ego</span></label><input id="name" value={design.name} onChange={(event) => update({ name: event.target.value })} maxLength={18} placeholder="e.g. Mica" /></div></div>
          <div className="builder-step"><div className="step-number">02</div><div className="step-content"><label>Choose your current mood</label><div className="choice-grid">{VIBES.map((item) => <button key={item.id} className={`choice ${design.vibe === item.id ? "selected" : ""}`} onClick={() => update({ vibe: item.id })}><span className="choice-glyph">{item.glyph}</span><span>{item.label}</span><small>{item.copy}</small></button>)}</div></div></div>
          <div className="builder-step"><div className="step-number">03</div><div className="step-content"><label htmlFor="note">Leave a field note <span>a phrase for the back of your mind</span></label><input id="note" value={design.note} onChange={(event) => update({ note: event.target.value })} maxLength={42} placeholder="e.g. make room for the strange" /></div></div>
          <div className="builder-step"><div className="step-number">04</div><div className="step-content"><label>Choose a signal color</label><div className="swatches">{ACCENTS.map((accent) => <button key={accent.value} aria-label={accent.label} className={`swatch ${design.accent === accent.value ? "selected" : ""}`} style={{ backgroundColor: accent.value }} onClick={() => update({ accent: accent.value })} />)}</div></div></div>
          <div className="builder-step product-step"><div className="step-number">05</div><div className="step-content"><label>Pick your base tee</label><div className="product-options"><div className="shirt-swatches">{SHIRT_COLORS.map((color) => <button key={color.value} className={`shirt-option ${design.shirtColor === color.value ? "selected" : ""}`} onClick={() => update({ shirtColor: color.value })}><span style={{ backgroundColor: color.hex }} />{color.label}</button>)}</div><div className="select-row"><select value={design.size} onChange={(event) => update({ size: event.target.value })} aria-label="Size">{SIZES.map((size) => <option key={size}>{size}</option>)}</select><div className="quantity"><button onClick={() => update({ quantity: Math.max(1, design.quantity - 1) })} aria-label="Decrease quantity">−</button><span>{design.quantity}</span><button onClick={() => update({ quantity: Math.min(5, design.quantity + 1) })} aria-label="Increase quantity">+</button></div></div></div></div></div>
        </div>
        <div className="preview-panel"><div className="preview-top"><span>LIVE PREVIEW</span><span>{design.name.toUpperCase()} / {vibe.label.toUpperCase()}</span></div><div className="preview-stage"><TeeShirt color={shirt.hex} design={design} previewSvg={previewSvg} /><div className="preview-coordinate">40° 43′ 39″ N<br />73° 59′ 08″ W</div></div><div className="preview-bottom"><span>PRINT AREA / FRONT</span><span>PATCHWORK 001</span></div></div>
      </section>

      <section className="details"><div><span className="detail-icon">◎</span><h3>Heavyweight<br />cotton</h3><p>Soft, structured, and built for repeat wears.</p></div><div><span className="detail-icon">✳</span><h3>Direct-to-<br />garment</h3><p>Full-color detail, printed only when you order.</p></div><div><span className="detail-icon">↗</span><h3>Made to<br />travel</h3><p>Ships worldwide from the nearest print studio.</p></div></section>

      <footer><div className="footer-brand"><span className="mark">+</span><span>PATCHWORK</span><small>PERSONAL SIGNAL GOODS</small></div><div className="footer-note">A small studio for<br />the signal inside you.</div><div className="footer-meta"><span>DROP 001 / 2026</span><span>BUILT TO ORDER</span><span>© PATCHWORK</span></div></footer>

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">[ YOUR BAG ]</p><h2>One signal.<br /><em>One tee.</em></h2></div><button className="close" onClick={() => setCartOpen(false)} aria-label="Close bag">×</button></div><div className="drawer-item"><div className="drawer-thumb"><TeeShirt color={shirt.hex} design={design} previewSvg={previewSvg} /></div><div><strong>Signal tee / {design.name}</strong><p>{vibe.label} · {design.size} · {shirt.label}</p><p className="drawer-note">{design.note}</p></div><strong>${total}</strong></div><div className="drawer-summary"><div><span>Subtotal</span><b>${total}</b></div><div><span>Shipping</span><span>Calculated at checkout</span></div><div className="drawer-total"><span>Total</span><b>${total} USD</b></div></div><button className="button button-dark full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Checkout <span>↗</span></button><p className="drawer-foot">Printed after payment · estimated dispatch 3–5 business days</p></aside></div>}

      {checkoutOpen && <div className="overlay" onClick={() => setCheckoutOpen(false)}><aside className="checkout-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">[ SECURE CHECKOUT ]</p><h2>Almost<br /><em>signal time.</em></h2></div><button className="close" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout">×</button></div><div className="checkout-lock"><span>⌁</span><div><strong>Secure checkout handoff</strong><small>Your tee is sent to print only after payment succeeds.</small></div></div><label htmlFor="shipping-name">Full name</label><input id="shipping-name" value={shippingName} onChange={(event) => setShippingName(event.target.value)} placeholder="Your name" autoComplete="name" /><label htmlFor="email">Email for order updates</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />{error && <p className="form-error">{error}</p>}<button className="button button-dark full" disabled={checkoutState === "loading"} onClick={startCheckout}>{checkoutState === "loading" ? "Opening secure checkout…" : `Continue to payment · $${total}`} <span>↗</span></button>{notice && <p>{notice}</p>}<p className="checkout-fine">Shipping address and card details are collected by Stripe in the next step.</p></aside></div>}
    </main>
  );
}

function TeeShirt({ color, design, previewSvg }: { color: string; design: Design; previewSvg: string }) {
  return <svg className="tee-svg" viewBox="0 0 440 510" role="img" aria-label={`Preview of ${design.name}'s personalized tee`}><path className="tee-body" fill={color} d="M120 88 50 126 8 220l71 42 35-52v247h212V210l35 52 71-42-42-94-70-38-38-18c-12 24-31 37-62 37s-50-13-62-37z" /><path className="tee-seam" d="M120 88c12 24 31 37 62 37s50-13 62-37M114 210v247M326 210v247" /><foreignObject x="114" y="157" width="212" height="235"><div className="tee-print" dangerouslySetInnerHTML={{ __html: previewSvg }} /></foreignObject><path className="tee-collar" d="M120 88c12 24 31 37 62 37s50-13 62-37" /><path className="tee-fold" d="M23 211 79 242M417 211 361 242" /></svg>;
}
