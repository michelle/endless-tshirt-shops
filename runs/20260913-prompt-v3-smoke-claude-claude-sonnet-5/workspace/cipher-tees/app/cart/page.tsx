"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DesignArt from "@/components/DesignArt";
import { useCart } from "@/components/CartStore";
import { PALETTES, SHIRT_COLORS, priceForSize, type SizeId } from "@/lib/types";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotalCents, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container empty-cart">
        <h1>Your cart is empty</h1>
        <p className="muted">Nothing to print yet.</p>
        <button className="btn btn-primary" onClick={() => router.push("/design")}>
          Build a tee
        </button>
      </div>
    );
  }

  return (
    <div className="container cart-page">
      <h1>Your cart</h1>
      <ul className="cart-list">
        {items.map((item) => (
          <li key={item.id} className="cart-item">
            <div className="cart-item-preview">
              <DesignArt spec={item.spec} width={90} height={110} />
            </div>
            <div className="cart-item-details">
              <strong>&ldquo;{item.spec.phrase}&rdquo;</strong>
              <span className="muted">
                {SHIRT_COLORS[item.spec.shirtColorId].name} · {item.size.toUpperCase()} ·{" "}
                {PALETTES[item.spec.paletteId].name}
              </span>
              <div className="qty-controls">
                <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease quantity">
                  −
                </button>
                <span>{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase quantity">
                  +
                </button>
              </div>
            </div>
            <div className="cart-item-price">
              <span>${((priceForSize(item.size as SizeId) * item.qty) / 100).toFixed(2)}</span>
              <button className="link-danger" onClick={() => removeItem(item.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${(subtotalCents / 100).toFixed(2)}</span>
        </div>
        <p className="muted small">
          Shipping is calculated at checkout. Only after Stripe confirms payment do we send your
          order to print.
        </p>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" onClick={handleCheckout} disabled={loading}>
          {loading ? "Redirecting…" : "Checkout with Stripe"}
        </button>
        <button className="btn btn-ghost" onClick={clear}>
          Clear cart
        </button>
      </div>
    </div>
  );
}
