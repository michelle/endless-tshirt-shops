"use client";

import { useState } from "react";
import { COUNTRIES } from "@/lib/geo";
import { money } from "@/lib/pricing";

const TEST_CARDS = [
  { number: "4242 4242 4242 4242", what: "payment succeeds" },
  { number: "4000 0000 0000 0002", what: "card declined" },
  { number: "4000 0000 0000 9995", what: "insufficient funds" },
];

export default function SandboxCheckout({
  token, ref_, amount, shipping,
}: { token: string; ref_: string; amount: number; shipping: string }) {
  const [form, setForm] = useState({
    email: "", phone: "",
    name: "", line1: "", line2: "", city: "", state: "", postal: "", country: "US",
    cardName: "", cardNumber: "", cardExp: "", cardCvc: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const country = COUNTRIES.find((c) => c.code === form.country);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          email: form.email,
          phone: form.phone,
          address: {
            name: form.name, line1: form.line1, line2: form.line2,
            city: form.city, state: form.state, postal: form.postal, country: form.country,
          },
          card: { name: form.cardName, number: form.cardNumber, exp: form.cardExp, cvc: form.cardCvc },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed.");
      window.location.href = `/order/${data.ref}`;
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay}>
      <div className="sandbox-banner">
        <b>Sandbox checkout</b>
        <p>
          This deployment has no live payment credentials, so it is running its built-in card
          simulator. No card is charged and no card data leaves this page&rsquo;s request. The exact
          same code path &mdash; authorise, then print &mdash; runs against Stripe Checkout as soon as
          <code> STRIPE_SECRET_KEY</code> is set.
        </p>
      </div>

      <h2>Checkout</h2>

      <div className="panel">
        <header><h3>Contact</h3></header>
        <div className="body">
          <label className="field">
            <span>Email</span>
            <input type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Phone (optional, helps couriers)</span>
            <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 555 010 0000" />
          </label>
        </div>
      </div>

      <div className="panel">
        <header><h3>Ship to</h3></header>
        <div className="body">
          <label className="field">
            <span>Full name</span>
            <input type="text" required value={form.name} onChange={set("name")} placeholder="Rosa Marques" />
          </label>
          <label className="field">
            <span>Address</span>
            <input type="text" required value={form.line1} onChange={set("line1")} placeholder="742 Evergreen Terrace" />
          </label>
          <label className="field">
            <span>Apartment, floor (optional)</span>
            <input type="text" value={form.line2} onChange={set("line2")} />
          </label>
          <div className="row2">
            <label className="field">
              <span>Town or city</span>
              <input type="text" required value={form.city} onChange={set("city")} placeholder="Springfield" />
            </label>
            <label className="field">
              <span>{country?.stateLabel || "State / region"}</span>
              <input type="text" value={form.state} onChange={set("state")} placeholder="OR" />
            </label>
          </div>
          <div className="row2" style={{ marginBottom: 0 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>{country?.postLabel || "Postal code"}</span>
              <input type="text" required value={form.postal} onChange={set("postal")} placeholder="97403" />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Country</span>
              <select value={form.country} onChange={set("country")}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="panel">
        <header><h3>Card</h3></header>
        <div className="body">
          <label className="field">
            <span>Name on card</span>
            <input type="text" required value={form.cardName} onChange={set("cardName")} placeholder="R MARQUES" />
          </label>
          <label className="field">
            <span>Card number</span>
            <input type="text" required inputMode="numeric" value={form.cardNumber}
              onChange={set("cardNumber")} placeholder="4242 4242 4242 4242" />
          </label>
          <div className="row2">
            <label className="field">
              <span>Expiry</span>
              <input type="text" required value={form.cardExp} onChange={set("cardExp")} placeholder="12/34" />
            </label>
            <label className="field">
              <span>Security code</span>
              <input type="text" required inputMode="numeric" value={form.cardCvc} onChange={set("cardCvc")} placeholder="123" />
            </label>
          </div>
          <div className="testcards">
            Test cards:{" "}
            {TEST_CARDS.map((c, i) => (
              <span key={c.number}>
                {i > 0 && " · "}
                <button type="button" onClick={() => setForm((f) => ({
                  ...f, cardNumber: c.number, cardExp: f.cardExp || "12/34", cardCvc: f.cardCvc || "123",
                  cardName: f.cardName || "R MARQUES",
                }))}>
                  <code>{c.number}</code>
                </button>{" "}
                {c.what}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="notice err">{error}</p>}

      <button className="btn accent block" type="submit" disabled={busy} style={{ marginTop: 8 }}>
        {busy ? <><span className="spin" /> Authorising&hellip;</> : `Pay ${money(amount)}`}
      </button>
      <p className="muted" style={{ textAlign: "center", marginTop: 10 }}>
        Order {ref_} &middot; {shipping} shipping &middot; your shirt goes to the press only after this succeeds.
      </p>
    </form>
  );
}
