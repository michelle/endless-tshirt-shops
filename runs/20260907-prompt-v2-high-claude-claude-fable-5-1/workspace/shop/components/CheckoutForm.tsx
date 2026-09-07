"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { COUNTRIES } from "@/lib/countries";
import { formatMoney, getColor, getDesign } from "@/lib/catalog";

type Quote = { subtotal: number; shipping: number; total: number; carrier?: string; issues?: string[] };

export function CheckoutForm({ mode, sandbox }: { mode: "stripe" | "test"; sandbox: boolean }) {
  const { lines, subtotal, hydrated, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", countryCode: "US",
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const country = COUNTRIES.find((c) => c.code === form.countryCode);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    let cancelled = false;
    setQuote(null);
    setQuoteError(null);
    fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines, countryCode: form.countryCode }) })
      .then(async (r) => {
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) setQuoteError(j.error ?? "Could not get a shipping quote");
        else setQuote(j);
      })
      .catch(() => !cancelled && setQuoteError("Could not get a shipping quote"));
    return () => { cancelled = true; };
  }, [hydrated, lines, form.countryCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines, address: form }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Checkout failed");
      if (j.mode === "stripe") {
        window.location.href = j.url;
        return;
      }
      clear();
      router.push(`/orders/${j.orderId}?ref=${j.ref}&new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  if (!hydrated) return <p className="mt-6">Loading…</p>;
  if (lines.length === 0)
    return (
      <p className="mt-6">Your cart is empty. <Link href="/#shirts" className="underline">Browse shirts</Link>.</p>
    );

  return (
    <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <h2 className="font-display text-xl">Shipping address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label>Full name</label><input required value={form.name} onChange={set("name")} autoComplete="name" /></div>
          <div><label>Email</label><input required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></div>
          <div><label>Phone (for the courier)</label><input value={form.phone} onChange={set("phone")} autoComplete="tel" /></div>
          <div className="sm:col-span-2"><label>Address line 1</label><input required value={form.line1} onChange={set("line1")} autoComplete="address-line1" /></div>
          <div className="sm:col-span-2"><label>Address line 2</label><input value={form.line2} onChange={set("line2")} autoComplete="address-line2" /></div>
          <div><label>City</label><input required value={form.city} onChange={set("city")} autoComplete="address-level2" /></div>
          <div><label>{country?.needsState ? "State / province" : "County / region (optional)"}</label><input required={country?.needsState} value={form.state} onChange={set("state")} autoComplete="address-level1" /></div>
          <div><label>Postal code</label><input required value={form.postalCode} onChange={set("postalCode")} autoComplete="postal-code" /></div>
          <div>
            <label>Country</label>
            <select value={form.countryCode} onChange={set("countryCode")} autoComplete="country">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <h2 className="pt-4 font-display text-xl">Payment</h2>
        {mode === "stripe" ? (
          <p className="text-sm text-ink/75">You&apos;ll be taken to Stripe&apos;s secure checkout to pay by card, Apple Pay or Google Pay. Shipping shown on the right is what Stripe will charge.</p>
        ) : (
          <div className="rounded border border-brass/60 bg-brass/10 p-4 text-sm">
            <div className="font-medium">Test mode — no payment is taken</div>
            <p className="mt-1 text-ink/75">
              This store isn&apos;t connected to a payment processor yet. Placing the order sends it to Prodigi&apos;s {sandbox ? "sandbox" : "live"} print API
              {sandbox ? " where it is validated but never printed or shipped" : ""}. Nothing is charged.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2"><label>Card number</label><input value="4242 4242 4242 4242" readOnly className="bg-white/40 text-ink/60" /></div>
              <div><label>Expiry / CVC</label><input value="12/34 · 123" readOnly className="bg-white/40 text-ink/60" /></div>
            </div>
          </div>
        )}
        {error && <p className="rounded border border-rust/40 bg-rust/10 p-3 text-sm">{error}</p>}
        <button type="submit" disabled={submitting || !quote} className="btn w-full sm:w-auto">
          {submitting ? "Placing order…" : mode === "stripe" ? `Pay ${quote ? formatMoney(quote.total) : ""} with Stripe` : `Place test order${quote ? ` · ${formatMoney(quote.total)}` : ""}`}
        </button>
      </div>

      <aside className="h-fit rounded-lg border border-ink/15 bg-paper-2/60 p-5 lg:col-span-2">
        <h2 className="font-display text-xl">Order summary</h2>
        <ul className="mt-4 divide-y divide-ink/10 text-sm">
          {lines.map((l) => (
            <li key={`${l.slug}-${l.color}-${l.size}`} className="flex justify-between py-2">
              <span>{l.quantity} × {getDesign(l.slug)?.name} <span className="text-ink/60">({getColor(l.color)?.label}, {l.size.toUpperCase()})</span></span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-ink/15 pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt>Standard shipping to {country?.name}</dt>
            <dd>{quote ? formatMoney(quote.shipping) : quoteError ? "—" : "quoting…"}</dd>
          </div>
          {quote?.carrier && <div className="text-xs text-ink/60">via {quote.carrier}</div>}
          <div className="flex justify-between border-t border-ink/15 pt-2 text-base font-medium"><dt>Total</dt><dd>{quote ? formatMoney(quote.total) : "—"}</dd></div>
        </dl>
        {quoteError && <p className="mt-3 text-sm text-rust">{quoteError}</p>}
        {form.countryCode === "US" && <p className="mt-3 text-xs text-ink/60">Prices exclude US sales tax, which may be added where applicable.</p>}
        <Link href="/cart" className="mt-4 inline-block text-sm underline">Edit cart</Link>
      </aside>
    </form>
  );
}
