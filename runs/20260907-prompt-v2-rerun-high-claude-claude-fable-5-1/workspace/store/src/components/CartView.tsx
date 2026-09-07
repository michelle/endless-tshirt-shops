"use client";
import Link from "next/link";
import { formatMoney, getColor, getDesign, lineKey, unitPriceCents } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { ShirtMockup } from "./ShirtMockup";

export function CartView() {
  const cart = useCart();
  if (!cart.ready) return <p className="muted">Loading your cart…</p>;
  if (cart.lines.length === 0)
    return (
      <div className="empty">
        <p>Your cart is empty. The parks are waiting.</p>
        <Link href="/" className="btn primary">
          Browse the parks
        </Link>
      </div>
    );
  return (
    <div className="cart">
      <ul className="cart-lines">
        {cart.lines.map((l) => {
          const d = getDesign(l.slug)!;
          const c = getColor(l.color)!;
          return (
            <li key={lineKey(l)} className="cart-line">
              <Link href={`/shirts/${d.slug}`} className="cart-thumb" style={{ background: d.paper }}>
                <ShirtMockup slug={d.slug} color={c} />
              </Link>
              <div className="cart-info">
                <Link href={`/shirts/${d.slug}`} className="cart-name">
                  {d.name}
                </Link>
                <div className="muted">
                  {c.name} · {l.size.toUpperCase()}
                </div>
                <div className="qty small-qty" aria-label="Quantity">
                  <button type="button" onClick={() => cart.setQty(l, l.qty - 1)} aria-label="Decrease quantity">
                    −
                  </button>
                  <span>{l.qty}</span>
                  <button type="button" onClick={() => cart.setQty(l, l.qty + 1)} aria-label="Increase quantity">
                    +
                  </button>
                  <button type="button" className="link-btn" onClick={() => cart.remove(l)}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="cart-price">{formatMoney(unitPriceCents(l.size) * l.qty)}</div>
            </li>
          );
        })}
      </ul>
      <div className="cart-summary">
        <div className="row">
          <span>Subtotal</span>
          <strong>{formatMoney(cart.subtotalCents)}</strong>
        </div>
        <div className="muted small">Shipping is quoted at checkout based on your country.</div>
        <Link href="/checkout" className="btn primary block">
          Checkout
        </Link>
        <Link href="/" className="muted small">
          ← Keep browsing
        </Link>
      </div>
    </div>
  );
}
