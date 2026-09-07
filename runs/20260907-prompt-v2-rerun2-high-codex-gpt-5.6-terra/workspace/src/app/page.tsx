"use client";

import { FormEvent, useMemo, useState } from "react";

const colors = [
  { name: "Black", api: "black", swatch: "#161719" },
  { name: "Natural", api: "natural", swatch: "#e5dfcf" },
  { name: "Midnight Navy", api: "navy blue", swatch: "#1d2e4a" },
];
const sizes = ["S", "M", "L", "XL", "2XL"];

export default function Storefront() {
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [checkout, setCheckout] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const total = useMemo(() => (32 * quantity).toFixed(2), [quantity]);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, color: color.api, size, quantity }) });
    const result = await response.json();
    setBusy(false);
    if (response.ok) setNotice(`Sandbox order ${result.id} is in the Prodigi queue. Nothing was charged.`);
    else setNotice(result.error || "Something went wrong.");
  }

  return <main>
    <div className="grain" />
    <header className="nav"><a className="wordmark" href="#top">NIGHT SHIFT<br />FIELD CLUB</a><a href="#story">FIELD NOTES</a><button className="bag" onClick={() => setCheckout(true)}>BAG <span>{quantity}</span></button></header>

    <section id="top" className="hero">
      <div className="eyebrow">Field equipment for the after-dark curious</div>
      <h1>Keep looking up.</h1>
      <p className="lede">A small-run tee for moon-watchers, porch naturalists, and anyone who knows the night is still busy.</p>
      <a className="text-link" href="#shop">Survey the specimen ↓</a>
      <div className="orb orb-one" /><div className="orb orb-two" />
    </section>

    <section id="shop" className="product-section">
      <div className="product-image" style={{ backgroundColor: color.swatch }}>
        <div className="star star-a">✦</div><div className="star star-b">✧</div>
        <img src="/night-shift-field-club.png" alt="Night Shift Field Club moth and observatory design" />
      </div>
      <div className="product-copy">
        <p className="eyebrow">Issue no. 01 / nocturne survey</p>
        <h2>The Luna<br />Observation Tee</h2>
        <p className="price">$32.00 <span>USD</span></p>
        <p className="detail">A soft, unisex Bella+Canvas 3001 tee with a front-only DTG print. Made when you order it.</p>
        <fieldset><legend>Color — {color.name}</legend><div className="swatches">{colors.map((option) => <button aria-label={option.name} className={`swatch ${color.api === option.api ? "selected" : ""}`} onClick={() => setColor(option)} key={option.api} style={{ background: option.swatch }} />)}</div></fieldset>
        <fieldset><legend>Size</legend><div className="sizes">{sizes.map((option) => <button className={size === option ? "selected" : ""} onClick={() => setSize(option)} key={option}>{option}</button>)}</div></fieldset>
        <div className="purchase"><div className="stepper"><button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(Math.min(5, quantity + 1))}>+</button></div><button className="primary" onClick={() => setCheckout(true)}>Add to bag — ${total}</button></div>
        <p className="micro">Made on demand · Printed with water-based inks · Ships from the nearest available facility</p>
      </div>
    </section>

    <section id="story" className="notes"><p className="eyebrow">The club rule</p><h2>Notice what<br />most people miss.</h2><p>We make field gear for the hour when ordinary things get strange: moth wings at the porch light, a radio tower blinking through fog, a sky full of unanswered questions.</p><div className="note-stats"><div><strong>01</strong><span>small-run design</span></div><div><strong>∞</strong><span>reasons to look up</span></div><div><strong>72–120</strong><span>hours to make</span></div></div></section>

    <footer><span>© 2026 Night Shift Field Club</span><span>Made for wandering eyes.</span></footer>

    {checkout && <div className="modal-backdrop" role="presentation"><section className="checkout" role="dialog" aria-modal="true" aria-label="Sandbox checkout"><button className="close" onClick={() => setCheckout(false)} aria-label="Close checkout">×</button><p className="eyebrow">Sandbox checkout</p><h2>Send a test<br />signal.</h2><p className="checkout-intro">This sends a test fulfillment order to Prodigi. No payment is collected and nothing will ship.</p><div className="order-line"><span>{quantity} × Luna Observation Tee / {color.name} / {size}</span><strong>${total}</strong></div><form onSubmit={submitOrder}><label>Full name<input required name="name" autoComplete="name" /></label><label>Email<input required name="email" type="email" autoComplete="email" /></label><label>Address<input required name="line1" autoComplete="address-line1" /></label><label>Address line 2 <small>(optional)</small><input name="line2" autoComplete="address-line2" /></label><div className="form-row"><label>City<input required name="city" autoComplete="address-level2" /></label><label>State<input required name="state" autoComplete="address-level1" /></label></div><div className="form-row"><label>ZIP / postal<input required name="zip" autoComplete="postal-code" /></label><label>Country code<input required name="country" maxLength={2} placeholder="US" autoComplete="country" /></label></div><button className="primary form-submit" disabled={busy}>{busy ? "Submitting…" : "Submit sandbox order"}</button></form>{notice && <p className={`notice ${notice.includes("Sandbox order") ? "success" : ""}`}>{notice}</p>}</section></div>}
  </main>;
}
