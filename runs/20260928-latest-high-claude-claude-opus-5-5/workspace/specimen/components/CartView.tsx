"use client";

import { useState } from "react";
import { useCart } from "./cart-store";
import { Specimen } from "./Specimen";
import { epithetFor } from "@/lib/design";
import { SHIPPING_OPTIONS, colorById, formatUsd, sizeById } from "@/lib/catalog";

export function Cart({ canceled }: { canceled: boolean }) {
  const { lines, ready, setQty, remove } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <h1 className="page-title">Your bag</h1>;

  if (lines.length === 0) {
    return (
      <div className="empty">
        <h1 className="page-title">Your bag is empty</h1>
        <p>No specimens collected yet.</p>
        <a className="btn" href="/design">
          Describe a specimen →
        </a>
      </div>
    );
  }

  const subtotal = lines.reduce((n, l) => n + (sizeById(l.design.size)?.priceCents ?? 0) * l.qty, 0);

  const checkout = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ design: l.design, qty: l.qty })) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Your bag</h1>
      {canceled && <div className="error" style={{ marginBottom: 16 }}>Checkout was canceled, and you haven&apos;t been charged. Your bag is still here.</div>}
      <div className="cart">
        <div>
          {lines.map((l) => {
            const size = sizeById(l.design.size);
            return (
              <div className="cart-line" key={l.id}>
                <div className="thumb">
                  <Specimen design={l.design} />
                </div>
                <div>
                  <h3>
                    {l.design.genus} {epithetFor(l.design.genus, l.design.trait)}
                  </h3>
                  <div className="meta">
                    FOR {l.design.name.toUpperCase()} · {colorById(l.design.color)?.label.toUpperCase()} · {size?.label}
                  </div>
                  <div className="qty" aria-label="Quantity">
                    <button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label="Decrease">
                      −
                    </button>
                    <span>{l.qty}</span>
                    <button type="button" onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase">
                      +
                    </button>
                  </div>
                  <button type="button" className="linkish" onClick={() => remove(l.id)}>
                    Remove
                  </button>
                </div>
                <div style={{ fontSize: 22 }}>{formatUsd((size?.priceCents ?? 0) * l.qty)}</div>
              </div>
            );
          })}
          <p style={{ marginTop: 18 }}>
            <a href="/design">+ Describe another specimen</a>
          </p>
        </div>
        <aside className="summary">
          <div className="label" style={{ marginBottom: 8 }}>
            Summary
          </div>
          <div className="line">
            <span>Subtotal</span>
            <span>{formatUsd(subtotal)}</span>
          </div>
          <div className="line note">
            <span>Shipping</span>
            <span>from {formatUsd(SHIPPING_OPTIONS[0].amountCents)}, chosen at checkout</span>
          </div>
          <div className="line total">
            <span>Total</span>
            <span>{formatUsd(subtotal)} + shipping</span>
          </div>
          <button type="button" className="btn block" style={{ marginTop: 16 }} onClick={checkout} disabled={busy}>
            {busy ? "Opening secure checkout…" : "Checkout securely"}
          </button>
          {error && <div className="error">{error}</div>}
          <p className="note" style={{ marginTop: 14 }}>
            Payment is handled by Stripe. Your shirts go to print only after your payment clears. Each one is made to
            order and ships in about a week.
          </p>
        </aside>
      </div>
    </>
  );
}
