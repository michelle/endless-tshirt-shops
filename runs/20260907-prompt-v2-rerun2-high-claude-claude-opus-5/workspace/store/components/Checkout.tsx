"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { COUNTRIES } from "@/lib/countries";
import { GARMENTS, PRICE_CENTS, SIZE_LABEL, getSaint, money } from "@/lib/catalog";
import { SHIPPING_METHODS } from "@/lib/shipping-methods";

type Quote = { subtotalCents: number; shippingCents: number; totalCents: number };

const EMPTY = {
  name: "", email: "", phone: "", line1: "", line2: "",
  city: "", state: "", postcode: "", country: "US",
};

export function Checkout() {
  const { items, ready, clear } = useCart();
  const router = useRouter();
  const [a, setA] = useState(EMPTY);
  const [method, setMethod] = useState("Budget");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const seq = useRef(0);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setA((p) => ({ ...p, [k]: e.target.value }));

  const refreshQuote = useCallback(async () => {
    if (items.length === 0) return;
    const n = ++seq.current;
    setQuoting(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, countryCode: a.country, shippingMethod: method }),
      });
      const body = await res.json();
      if (n !== seq.current) return;                       // a newer request won
      if (!res.ok) { setQuote(null); setError(body.error ?? "Could not price shipping"); }
      else { setQuote(body); setError(null); }
    } catch {
      if (n === seq.current) { setQuote(null); setError("Network error while pricing shipping"); }
    } finally {
      if (n === seq.current) setQuoting(false);
    }
  }, [items, a.country, method]);

  useEffect(() => { if (ready) void refreshQuote(); }, [ready, refreshQuote]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, address: a, shippingMethod: method }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Checkout failed"); setPlacing(false); return; }
      if (body.mode === "stripe" && body.url) { window.location.href = body.url; return; }
      clear();
      router.push(`/orders/${encodeURIComponent(body.orderId)}`);
    } catch {
      setError("Network error. Nothing was charged.");
      setPlacing(false);
    }
  }

  if (!ready) return <p className="muted">One moment…</p>;
  if (items.length === 0)
    return (
      <div className="panel center" style={{ padding: 44 }}>
        <p className="muted" style={{ marginTop: 0 }}>Your cart is empty.</p>
        <Link className="btn" href="/">Browse the saints</Link>
      </div>
    );

  const subtotal = quote?.subtotalCents ?? items.reduce((s, i) => s + i.qty * PRICE_CENTS, 0);

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1.35fr .8fr", gap: 34, alignItems: "start" }}
      className="checkout-grid">
      <div className="panel">
        <h2 className="caps" style={{ margin: "0 0 16px" }}>Ship to</h2>
        <div className="form-grid">
          <label className="f full"><span>Full name</span>
            <input className="t" required autoComplete="name" value={a.name} onChange={set("name")} /></label>
          <label className="f full"><span>Email</span>
            <input className="t" required type="email" autoComplete="email" value={a.email} onChange={set("email")} /></label>
          <label className="f full"><span>Address</span>
            <input className="t" required autoComplete="address-line1" value={a.line1} onChange={set("line1")} /></label>
          <label className="f full"><span>Apartment, suite (optional)</span>
            <input className="t" autoComplete="address-line2" value={a.line2} onChange={set("line2")} /></label>
          <label className="f"><span>Town / city</span>
            <input className="t" required autoComplete="address-level2" value={a.city} onChange={set("city")} /></label>
          <label className="f"><span>State / county</span>
            <input className="t" autoComplete="address-level1" value={a.state} onChange={set("state")} /></label>
          <label className="f"><span>Postal / ZIP code</span>
            <input className="t" required autoComplete="postal-code" value={a.postcode} onChange={set("postcode")} /></label>
          <label className="f"><span>Country</span>
            <select className="t" value={a.country} onChange={set("country")}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select></label>
          <label className="f full"><span>Phone (helps the courier)</span>
            <input className="t" autoComplete="tel" value={a.phone} onChange={set("phone")} /></label>
        </div>

        <h2 className="caps" style={{ margin: "26px 0 12px" }}>Shipping service</h2>
        {SHIPPING_METHODS.map((m) => (
          <label key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "9px 0", cursor: "pointer" }}>
            <input type="radio" name="ship" value={m.id} checked={method === m.id}
              onChange={() => setMethod(m.id)} style={{ marginTop: 6 }} />
            <span>
              <strong>{m.label}</strong>
              <span className="muted" style={{ display: "block", fontSize: ".88rem" }}>{m.note}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="panel" style={{ position: "sticky", top: 96 }}>
        <h2 className="caps" style={{ margin: "0 0 14px" }}>Summary</h2>
        {items.map((i) => {
          const saint = getSaint(i.slug);
          const g = GARMENTS.find((x) => x.id === i.color);
          return (
            <div className="totals" key={`${i.slug}|${i.color}|${i.size}`}>
              <span style={{ fontSize: ".92rem", paddingRight: 12 }}>
                {saint?.plateName ?? i.slug}
                <span className="muted">
                  {" "}· {g?.label ?? i.color} · {SIZE_LABEL[i.size] ?? i.size} · ×{i.qty}
                </span>
              </span>
              <span>{money(i.qty * PRICE_CENTS)}</span>
            </div>
          );
        })}
        <div className="totals" style={{ borderTop: "1px solid var(--rule)", marginTop: 8, paddingTop: 12 }}>
          <span>Subtotal</span><span>{money(subtotal)}</span>
        </div>
        <div className="totals">
          <span>Shipping</span>
          <span>{quoting ? <em className="muted" style={{ fontSize: ".88rem" }}>calculating…</em> : quote ? money(quote.shippingCents) : "—"}</span>
        </div>
        <div className="totals grand">
          <span>Total</span>
          <span>{quote ? money(quote.totalCents) : "—"}</span>
        </div>
        <p className="muted" style={{ fontSize: ".8rem" }}>
          Shipping is quoted live by our print partner and passed through at cost.
          Any import duty is the recipient&rsquo;s responsibility.
        </p>

        {error && <p className="notice bad">{error}</p>}

        <button className="btn wide" type="submit" disabled={placing || quoting || !quote}>
          {placing ? "Placing order…" : quoting ? "Pricing shipping…" : "Place order"}
        </button>
      </div>
    </form>
  );
}
