"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, SHIRT_CENTS, US_STATES, shirtById, type DesignSpec } from "@/lib/catalog";
import { formatDate, placeLabel } from "@/lib/design";
import { Shirt } from "./Shirt";

const STORAGE = "stillpoint.design";

type Quote = { method: string; available: boolean; shippingCents: number; totalCents: number };

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function CheckoutForm({ cancelled }: { cancelled: boolean }) {
  const [spec, setSpec] = useState<DesignSpec | null>(null);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState("Standard");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [ship, setShip] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE);
    if (!raw) return;
    try {
      setSpec(JSON.parse(raw) as DesignSpec);
    } catch {
      setSpec(null);
    }
  }, []);

  useEffect(() => {
    if (!spec) return;
    const handle = setTimeout(async () => {
      setQuoting(true);
      setError("");
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: spec, qty, country: ship.country }),
      });
      const data = await res.json();
      setQuoting(false);
      if (!res.ok) {
        setQuotes([]);
        setError(data.error || "Could not price shipping.");
        return;
      }
      setQuotes(data.quotes || []);
      if (!data.quotes?.some((q: Quote) => q.method === method && q.available)) {
        const next = data.quotes?.find((q: Quote) => q.available);
        if (next) setMethod(next.method);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [spec, qty, ship.country]);

  if (!spec) {
    return (
      <div className="panel">
        <h1>No shirt yet.</h1>
        <p>Design the hour first, then come back to ship it.</p>
        <a className="ghost" href="/">Back to the studio</a>
      </div>
    );
  }

  const selected = quotes.find((q) => q.method === method && q.available);
  const color = shirtById(spec.color);
  const who = [spec.name1, spec.name2].filter(Boolean).join(" & ");

  async function pay() {
    setPaying(true);
    setError("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ design: spec, ship, qty, shipMethod: method }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setPaying(false);
      setError(data.error || "Could not start payment.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="panel">
      <p className="eyebrow">Shipping & payment</p>
      <h1>Where should it go?</h1>
      {cancelled && <p className="error">Payment was cancelled. The shirt was not sent to print.</p>}
      <div className="summary">
        <Shirt spec={spec} mode="shirt" />
        <div>
          <p className="who">{who}</p>
          <p>{placeLabel(spec.place, spec.region)}</p>
          <p>{formatDate(spec.date)} · {color?.name} · {spec.size.toUpperCase()}</p>
          {spec.line && <p>“{spec.line}”</p>}
        </div>
      </div>

      <div className="grid-2">
        <label className="field">Recipient
          <input value={ship.name} onChange={(e) => setShip({ ...ship, name: e.target.value })} autoComplete="name" />
        </label>
        <label className="field">Email
          <input type="email" value={ship.email} onChange={(e) => setShip({ ...ship, email: e.target.value })} autoComplete="email" />
        </label>
        <label className="field">Street
          <input value={ship.line1} onChange={(e) => setShip({ ...ship, line1: e.target.value })} autoComplete="address-line1" />
        </label>
        <label className="field">Apartment, optional
          <input value={ship.line2} onChange={(e) => setShip({ ...ship, line2: e.target.value })} autoComplete="address-line2" />
        </label>
        <label className="field">City
          <input value={ship.city} onChange={(e) => setShip({ ...ship, city: e.target.value })} autoComplete="address-level2" />
        </label>
        <label className="field">State or region
          {ship.country === "US" ? (
            <select value={ship.state} onChange={(e) => setShip({ ...ship, state: e.target.value })}>
              <option value="">Choose</option>
              {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          ) : (
            <input value={ship.state} onChange={(e) => setShip({ ...ship, state: e.target.value })} autoComplete="address-level1" />
          )}
        </label>
        <label className="field">Postal code
          <input value={ship.zip} onChange={(e) => setShip({ ...ship, zip: e.target.value })} autoComplete="postal-code" />
        </label>
        <label className="field">Country
          <select value={ship.country} onChange={(e) => setShip({ ...ship, country: e.target.value, state: "" })}>
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <label className="field">Phone, optional
          <input value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} autoComplete="tel" />
        </label>
        <label className="field">Quantity
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <p className="kicker"><em>Ship</em> method</p>
      <div className="methods">
        {quotes.filter((q) => q.available).map((q) => (
          <label key={q.method}>
            <span><input type="radio" name="method" checked={method === q.method} onChange={() => setMethod(q.method)} /> {q.method}</span>
            <span>{money(q.shippingCents)}</span>
          </label>
        ))}
        {quoting && <p className="hint">Pricing shipping…</p>}
      </div>

      <div className="totals">
        <div><span>Shirt × {qty}</span><span>{money(SHIRT_CENTS * qty)}</span></div>
        <div><span>Shipping</span><span>{selected ? money(selected.shippingCents) : "—"}</span></div>
        <div className="grand"><span>Total</span><span>{selected ? money(selected.totalCents) : "—"}</span></div>
      </div>
      <p className="hint">We send the shirt to Prodigi only after Stripe confirms this payment. Test card 4242 4242 4242 4242.</p>
      {error && <p className="error">{error}</p>}
      <button className="primary" type="button" disabled={paying || !selected} onClick={pay}>
        {paying ? "Opening Stripe…" : "Pay and print"}
      </button>
    </div>
  );
}
