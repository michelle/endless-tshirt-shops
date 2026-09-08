"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { getProduct, formatPrice } from "@/lib/products";

interface OrderResult {
  order?: {
    id: string;
    status?: { stage: string };
  };
  quote?: {
    quotes?: Array<{
      costSummary?: {
        totalCost?: { amount: string; currency: string };
        items?: { amount: string; currency: string };
        shipping?: { amount: string; currency: string };
      };
    }>;
  };
  error?: string;
  details?: unknown;
}

export default function CheckoutPage() {
  const { items, subtotal, clear, ready } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    townOrCity: "",
    stateOrCounty: "",
    postalOrZipCode: "",
    countryCode: "US",
  });

  if (!ready) return null;

  if (items.length === 0 && !result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl">Nothing to check out.</h1>
        <Link
          href="/#personnel"
          className="stamped mt-8 inline-block rounded-md bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper"
        >
          Browse Personnel Files
        </Link>
      </div>
    );
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          recipient: form,
          shippingMethod: "Standard",
        }),
      });
      const data = await res.json();
      setResult(data);
      if (res.ok) clear();
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const quoteSummary = result.quote?.quotes?.[0]?.costSummary;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        {result.order?.id ? (
          <>
            <div className="font-type text-xs uppercase tracking-[0.3em] text-stamp">
              Order Filed
            </div>
            <h1 className="mt-2 font-display text-3xl">
              Case #{result.order.id} is open.
            </h1>
            <p className="mt-4 text-ink/80">
              Your order was submitted to the Bureau&apos;s print partner
              (Prodigi, sandbox mode). Status:{" "}
              <span className="font-display uppercase">
                {result.order.status?.stage ?? "received"}
              </span>
              .
            </p>
            {quoteSummary?.totalCost && (
              <div className="stamped mt-6 rounded-md bg-paper-dark/50 p-4 font-type text-sm">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>${quoteSummary.items?.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>${quoteSummary.shipping?.amount}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-ink/20 pt-2 font-display text-base">
                  <span>Total</span>
                  <span>
                    ${quoteSummary.totalCost.amount} {quoteSummary.totalCost.currency}
                  </span>
                </div>
              </div>
            )}
            <p className="mt-6 text-xs text-ink/50">
              This store runs against Prodigi&apos;s sandbox API for
              demonstration — no payment was charged and nothing will
              physically print or ship.
            </p>
            <Link
              href="/"
              className="mt-8 inline-block rounded-md border-2 border-ink px-6 py-3 font-display text-sm uppercase tracking-wide hover:bg-ink hover:text-paper"
            >
              Back to the Bureau
            </Link>
          </>
        ) : (
          <>
            <div className="font-type text-xs uppercase tracking-[0.3em] text-stamp">
              Filing Rejected
            </div>
            <h1 className="mt-2 font-display text-3xl">Something went sideways.</h1>
            <p className="mt-4 text-ink/80">{result.error ?? "Unknown error."}</p>
            {!!result.details && (
              <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-ink/90 p-4 text-xs text-paper/80">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            )}
            <button
              onClick={() => setResult(null)}
              className="mt-8 rounded-md border-2 border-ink px-6 py-3 font-display text-sm uppercase tracking-wide hover:bg-ink hover:text-paper"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl">Checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="font-display text-xs uppercase tracking-wide text-ink/60">
            Shipping Address
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Full name"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2 sm:col-span-2"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
            <input
              type="email"
              placeholder="Email (optional)"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
            <input
              placeholder="Phone (optional)"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
            <input
              required
              placeholder="Address line 1"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2 sm:col-span-2"
              value={form.line1}
              onChange={(e) => update("line1", e.target.value)}
            />
            <input
              placeholder="Address line 2 (optional)"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2 sm:col-span-2"
              value={form.line2}
              onChange={(e) => update("line2", e.target.value)}
            />
            <input
              required
              placeholder="City"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2"
              value={form.townOrCity}
              onChange={(e) => update("townOrCity", e.target.value)}
            />
            <input
              placeholder="State / county"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2"
              value={form.stateOrCounty}
              onChange={(e) => update("stateOrCounty", e.target.value)}
            />
            <input
              required
              placeholder="Postal / ZIP code"
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2"
              value={form.postalOrZipCode}
              onChange={(e) => update("postalOrZipCode", e.target.value)}
            />
            <input
              required
              placeholder="Country code (e.g. US, GB, AU)"
              maxLength={2}
              className="rounded-md border-2 border-ink/30 bg-paper px-3 py-2 uppercase"
              value={form.countryCode}
              onChange={(e) => update("countryCode", e.target.value.toUpperCase())}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="stamped mt-4 w-full rounded-md bg-stamp px-6 py-3 font-display text-sm uppercase tracking-wide text-paper disabled:opacity-60"
          >
            {submitting ? "Filing Order…" : "Place Order (Sandbox)"}
          </button>
          <p className="text-xs text-ink/50">
            No payment is collected. This calls Prodigi&apos;s sandbox
            print-on-demand API — a real order object is created for
            testing, but nothing is charged, printed, or shipped.
          </p>
        </form>

        <div>
          <div className="font-display text-xs uppercase tracking-wide text-ink/60">
            Order Summary
          </div>
          <div className="mt-3 space-y-3">
            {items.map((item) => {
              const product = getProduct(item.slug);
              if (!product) return null;
              return (
                <div
                  key={`${item.slug}-${item.size}-${item.color}`}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {product.name} × {item.qty}{" "}
                    <span className="text-ink/50">
                      ({item.size.toUpperCase()}, {item.color})
                    </span>
                  </span>
                  <span>{formatPrice(product.price * item.qty)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between border-t-2 border-ink/20 pt-3 font-display text-lg">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-ink/50">
            Final shipping cost is calculated live via Prodigi and shown on
            your confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
