"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { artUrl } from "@/lib/art";
import { formatUsd, priceFor, isCatalogDesign } from "@/lib/catalog";
import { GARMENT_BY_ID, INKS, SIZES, designSubtitle, encodeLineItem } from "@/lib/design";

export default function CartPage() {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.lines.map((l) =>
            encodeLineItem(l.design, l.size, l.garmentId, l.qty),
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
      setBusy(false);
    }
  }

  if (!cart.ready) {
    return (
      <div className="wrap" style={{ padding: "70px 24px 90px" }}>
        <p className="cart-meta">Loading cart…</p>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="wrap" style={{ padding: "70px 24px 110px", maxWidth: 620 }}>
        <p className="eyebrow">Cart</p>
        <h1 className="hero-title" style={{ fontSize: 34 }}>
          Nothing in here yet.
        </h1>
        <p className="product-note">
          Every rule is still available. That is the nice thing about generating
          the stock on demand.
        </p>
        <div className="row">
          <a className="btn btn-primary" href="/#catalog">
            Browse the collection
          </a>
          <a className="btn" href="/design">
            Design your own
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "56px 24px 110px", maxWidth: 820 }}>
      <p className="eyebrow">Cart</p>
      <h1 className="hero-title" style={{ fontSize: 34, marginBottom: 28 }}>
        {cart.count} {cart.count === 1 ? "shirt" : "shirts"}
      </h1>

      {cart.lines.map((line) => {
        const garment = GARMENT_BY_ID[line.garmentId];
        const unit = priceFor(line.design, line.size);
        return (
          <div className="cart-row" key={line.key}>
            <div
              className="cart-thumb"
              style={{ background: garment?.hex ?? "#111", padding: 4 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artUrl(line.design, 260)}
                alt=""
                style={{ width: "100%", display: "block", imageRendering: "pixelated" }}
              />
            </div>

            <div>
              <div className="cart-name">
                {line.name}
                {!isCatalogDesign(line.design) ? (
                  <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>
                    {"  "}ONE OF ONE
                  </span>
                ) : null}
              </div>
              <div className="cart-meta">
                {designSubtitle(line.design)} · {INKS[line.design.ink].name} ink ·{" "}
                {garment?.name} · {SIZES.find((s) => s.id === line.size)?.label}
              </div>
              <div className="row" style={{ marginTop: 9 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => cart.setQty(line.key, line.qty - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span
                  className="mono"
                  style={{ alignSelf: "center", minWidth: 20, textAlign: "center" }}
                >
                  {line.qty}
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => cart.setQty(line.key, line.qty + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: 8 }}
                  onClick={() => cart.remove(line.key)}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mono" style={{ fontSize: 14 }}>
              {formatUsd(unit * line.qty)}
            </div>
          </div>
        );
      })}

      <div className="cart-total">
        <span className="muted">Subtotal</span>
        <span>{formatUsd(cart.subtotal)}</span>
      </div>
      <p className="cart-meta" style={{ marginTop: -10, marginBottom: 24 }}>
        Shipping is chosen at checkout. Taxes, where they apply, are calculated
        by Stripe.
      </p>

      {error ? (
        <p className="notice" style={{ borderColor: "#c0504d", color: "#ef8f8c" }}>
          {error}
        </p>
      ) : null}

      <button className="btn btn-primary btn-block" onClick={checkout} disabled={busy}>
        {busy ? "Redirecting to Stripe…" : "Checkout"}
      </button>
    </div>
  );
}
