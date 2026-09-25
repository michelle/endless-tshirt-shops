"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const COUNTRIES: Array<[string, string]> = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["NL", "Netherlands"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["JP", "Japan"],
];

interface OrderSummary {
  ref: string;
  title: string;
  place: string;
  date: string;
  time: string;
  color: string;
  size: string;
}

function decode(token: string): OrderSummary | null {
  try {
    const body = token.split(".")[0];
    const json = JSON.parse(
      atob(body.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return json;
  } catch {
    return null;
  }
}

export default function PayForm({ token }: { token: string }) {
  const router = useRouter();
  const summary = useMemo(() => decode(token), [token]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    cardName: "",
    number: "",
    exp: "",
    cvc: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          card: { name: form.cardName, number: form.number, exp: form.exp, cvc: form.cvc },
          shipping: {
            name: form.name,
            email: form.email,
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            zip: form.zip,
            country: form.country,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "payment failed");
      router.push(
        `/success?ref=${encodeURIComponent(json.ref)}&po=${encodeURIComponent(
          json.prodigiOrderId
        )}&t=${encodeURIComponent(token)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <main className="center-wrap">
      <div className="brand" style={{ marginBottom: 26 }}>
        Star<span>lit</span>
      </div>
      <div className="badge">Sandbox checkout · no real charge</div>

      {summary && (
        <div className="order-summary">
          <strong>“{summary.title}”</strong> — {summary.place}
          <br />
          {summary.date} · {summary.time} · {summary.color} tee, size{" "}
          {summary.size.toUpperCase()}
          <br />
          Order {summary.ref}
        </div>
      )}

      <form onSubmit={submit} className="panel">
        <h2>Shipping</h2>
        <div className="field">
          <label>Full name</label>
          <input required value={form.name} onChange={set("name")} />
        </div>
        <div className="field">
          <label>Email</label>
          <input required type="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label>Address line 1</label>
          <input required value={form.line1} onChange={set("line1")} />
        </div>
        <div className="field">
          <label>Address line 2 (optional)</label>
          <input value={form.line2} onChange={set("line2")} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>City</label>
            <input required value={form.city} onChange={set("city")} />
          </div>
          <div className="field">
            <label>State / region</label>
            <input value={form.state} onChange={set("state")} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>ZIP / postcode</label>
            <input required value={form.zip} onChange={set("zip")} />
          </div>
          <div className="field">
            <label>Country</label>
            <select value={form.country} onChange={set("country")}>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 style={{ marginTop: 28 }}>Payment</h2>
        <p className="sub">
          Test card <code>4242 4242 4242 4242</code>, any future expiry, any CVC.{" "}
          <code>4000 0000 0000 0002</code> simulates a decline.
        </p>
        <div className="field">
          <label>Name on card</label>
          <input required value={form.cardName} onChange={set("cardName")} />
        </div>
        <div className="field">
          <label>Card number</label>
          <input
            required
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            value={form.number}
            onChange={set("number")}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Expiry (MM/YY)</label>
            <input required placeholder="12/28" value={form.exp} onChange={set("exp")} />
          </div>
          <div className="field">
            <label>CVC</label>
            <input required inputMode="numeric" placeholder="123" value={form.cvc} onChange={set("cvc")} />
          </div>
        </div>

        <div className="pay-total">
          <span>Total</span>
          <span>$39.98</span>
        </div>
        <div className="price-note">$34.99 shirt + $4.99 standard tracked shipping</div>

        <button className="buy-btn" disabled={busy}>
          {busy ? "Processing payment…" : "Pay $39.98"}
        </button>
        {error && <div className="error-box">{error}</div>}
      </form>
    </main>
  );
}
