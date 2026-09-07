"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, getColor, getDesign, lineKey, unitPriceCents } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { countries } from "@/lib/countries";
import type { PaymentMode } from "@/lib/site";

type Option = { method: string; amountCents: number; label: string };

export function CheckoutForm({ mode, cancelled }: { mode: PaymentMode; cancelled: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" });
  const [options, setOptions] = useState<Option[] | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [method, setMethod] = useState("Standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Re-quote shipping whenever the destination country or the cart changes.
  const cartSig = cart.lines.map((l) => `${lineKey(l)}x${l.qty}`).join(",");
  useEffect(() => {
    if (!cart.ready || cart.lines.length === 0) return;
    let stale = false;
    setOptions(null);
    setQuoteError(null);
    fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.lines, country: form.country }) })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not get a shipping quote");
        return j.options as Option[];
      })
      .then((opts) => {
        if (stale) return;
        setOptions(opts);
        if (!opts.some((o) => o.method === method)) setMethod(opts[0].method);
      })
      .catch((e) => !stale && setQuoteError(e.message));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country, cartSig, cart.ready]);

  if (!cart.ready) return <p className="muted">Loading…</p>;
  if (cart.lines.length === 0)
    return (
      <div className="empty">
        <p>There is nothing to check out yet.</p>
        <Link href="/" className="btn primary">
          Browse the parks
        </Link>
      </div>
    );

  const shipping = options?.find((o) => o.method === method) ?? null;
  const total = cart.subtotalCents + (shipping?.amountCents ?? 0);
  const needsState = ["US", "CA", "AU"].includes(form.country);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.lines, recipient: form, shippingMethod: method }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Checkout failed");
      if (j.redirect) {
        // Stripe: the cart is cleared when the order confirmation page loads.
        window.location.assign(j.redirect);
        return;
      }
      cart.clear();
      router.push(`/order/${j.orderId}?t=${encodeURIComponent(j.token)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form className="checkout" onSubmit={submit}>
      <div className="checkout-form">
        {cancelled && <div className="notice">Payment was cancelled. Your cart is still here whenever you are ready.</div>}
        <h2>Ship to</h2>
        <div className="grid2">
          <label>
            Full name
            <input required value={form.name} onChange={set("name")} autoComplete="name" />
          </label>
          <label>
            Email (for order updates)
            <input required type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          </label>
        </div>
        <label>
          Address line 1
          <input required value={form.line1} onChange={set("line1")} autoComplete="address-line1" />
        </label>
        <label>
          Address line 2 <span className="muted">(optional)</span>
          <input value={form.line2} onChange={set("line2")} autoComplete="address-line2" />
        </label>
        <div className="grid2">
          <label>
            City
            <input required value={form.city} onChange={set("city")} autoComplete="address-level2" />
          </label>
          <label>
            {needsState ? "State / province" : "State / county"} {!needsState && <span className="muted">(optional)</span>}
            <input required={needsState} value={form.state} onChange={set("state")} autoComplete="address-level1" />
          </label>
        </div>
        <div className="grid2">
          <label>
            Postal code
            <input required value={form.postalCode} onChange={set("postalCode")} autoComplete="postal-code" />
          </label>
          <label>
            Country
            <select value={form.country} onChange={set("country")} autoComplete="country">
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Phone <span className="muted">(optional, for the courier)</span>
          <input value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </label>

        <h2>Shipping</h2>
        {quoteError && <div className="error">{quoteError}</div>}
        {!options && !quoteError && <p className="muted">Getting live shipping rates…</p>}
        {options && (
          <div className="ship-options">
            {options.map((o) => (
              <label key={o.method} className={o.method === method ? "ship-option active" : "ship-option"}>
                <input type="radio" name="ship" value={o.method} checked={o.method === method} onChange={() => setMethod(o.method)} />
                <span>{o.label}</span>
                <strong>{formatMoney(o.amountCents)}</strong>
              </label>
            ))}
          </div>
        )}
      </div>

      <aside className="checkout-summary">
        <h2>Your order</h2>
        <ul className="summary-lines">
          {cart.lines.map((l) => {
            const d = getDesign(l.slug)!;
            const c = getColor(l.color)!;
            return (
              <li key={lineKey(l)}>
                <span>
                  {l.qty} × {d.name} <span className="muted">({c.name}, {l.size.toUpperCase()})</span>
                </span>
                <span>{formatMoney(unitPriceCents(l.size) * l.qty)}</span>
              </li>
            );
          })}
        </ul>
        <div className="row">
          <span>Subtotal</span>
          <span>{formatMoney(cart.subtotalCents)}</span>
        </div>
        <div className="row">
          <span>Shipping</span>
          <span>{shipping ? formatMoney(shipping.amountCents) : "—"}</span>
        </div>
        <div className="row total">
          <span>Total</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        {mode === "sandbox" ? (
          <p className="small muted">
            Test mode: no card is required and nothing is charged. Your order is sent to the Prodigi sandbox so you can watch it move through the fulfilment pipeline.
          </p>
        ) : (
          <p className="small muted">You will be taken to Stripe to pay securely. Taxes, where applicable, are shown there.</p>
        )}
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn primary block" disabled={submitting || !shipping}>
          {submitting ? "Placing order…" : mode === "sandbox" ? "Place test order" : "Continue to payment"}
        </button>
      </aside>
    </form>
  );
}
