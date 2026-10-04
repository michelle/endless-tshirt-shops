"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PRICE_CENTS, SHIP_COUNTRIES, SHIRT_COLORS, SIZE_LABEL, MAX_QTY_PER_ITEM, money } from "@/lib/catalog";
import { designToParam, type CartItem } from "@/lib/design";
import { readCart, writeCart } from "@/lib/cart";

export function CartView() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [country, setCountry] = useState("US");
  const [shipping, setShipping] = useState<number | null>(null);
  const [shipErr, setShipErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { setItems(readCart()); }, []);

  const sig = items ? JSON.stringify(items) : "";
  useEffect(() => {
    if (!items?.length) return;
    let live = true;
    setShipping(null); setShipErr("");
    fetch("/api/shipping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, country }) })
      .then(async (r) => { const j = await r.json(); if (!live) return; if (r.ok) setShipping(j.shippingCents); else setShipErr(j.error || "Could not calculate shipping."); })
      .catch(() => live && setShipErr("Could not calculate shipping."));
    return () => { live = false; };
  }, [sig, country]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <p className="muted">Loading…</p>;
  if (!items.length) {
    return <div><p className="muted">Your cart is empty. The sky is waiting.</p><Link href="/design" className="btn">Design your tee</Link></div>;
  }

  const update = (next: CartItem[]) => { setItems(next); writeCart(next); };
  const subtotal = items.reduce((n, i) => n + i.qty * PRICE_CENTS, 0);

  const checkout = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, country }) });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || "Could not start checkout.");
      window.location.href = j.url;
    } catch (e: any) {
      setErr(e.message); setBusy(false);
    }
  };

  return (
    <div className="cartgrid">
      <div>
        {items.map((it, idx) => {
          const shirt = SHIRT_COLORS.find((s) => s.id === it.design.shirt)!;
          return (
            <div className="line" key={idx}>
              <img src={`/api/mockup?fmt=png&bg=1&w=300&d=${designToParam(it.design)}`} alt="" width={110} height={110} />
              <div>
                <h3>{it.design.title || "Your sky"}</h3>
                <div className="meta">{shirt.label} · {SIZE_LABEL[it.size]} · {it.design.place.name}, {it.design.date}</div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center" }}>
                  <div className="qty">
                    <button onClick={() => update(items.map((x, i) => i === idx ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} aria-label="Fewer">−</button>
                    <span>{it.qty}</span>
                    <button onClick={() => update(items.map((x, i) => i === idx ? { ...x, qty: Math.min(MAX_QTY_PER_ITEM, x.qty + 1) } : x))} aria-label="More">+</button>
                  </div>
                  <Link className="rm" href={`/design?d=${designToParam(it.design)}`}>Use as starting point</Link>
                  <button className="rm" onClick={() => update(items.filter((_, i) => i !== idx))}>Remove</button>
                </div>
              </div>
              <b>{money(it.qty * PRICE_CENTS)}</b>
            </div>
          );
        })}
        <p style={{ marginTop: 20 }}><Link href="/design" className="muted">+ Design another shirt</Link></p>
      </div>

      <aside className="summary">
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="country" className="lab">Ship to</label>
          <select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
            {Object.entries(SHIP_COUNTRIES).sort((a, b) => a[1].localeCompare(b[1])).map(([cc, name]) => <option key={cc} value={cc}>{name}</option>)}
          </select>
        </div>
        <div className="r"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="r"><span>Shipping</span><span>{shipErr ? "-" : shipping == null ? "Calculating…" : money(shipping)}</span></div>
        <div className="r total"><span>Total</span><span>{shipping == null ? "-" : money(subtotal + shipping)}</span></div>
        {shipErr && <p className="err" role="alert">{shipErr}</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn block" style={{ marginTop: 14 }} onClick={checkout} disabled={busy || shipping == null}>
          {busy ? "Redirecting…" : "Checkout securely"}
        </button>
        <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>Payment is handled by Stripe. We never see your card. Your shirt is sent to print only after payment succeeds.</p>
      </aside>
    </div>
  );
}
