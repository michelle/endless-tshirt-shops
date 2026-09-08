"use client";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { GARMENTS, PRICE_CENTS, SIZE_LABEL, getSaint, money, mockupSrc } from "@/lib/catalog";

export function CartView() {
  const { items, setQty, remove, ready } = useCart();

  if (!ready) return <p className="muted">Opening the ledger…</p>;
  if (items.length === 0)
    return (
      <div className="panel center" style={{ padding: 48 }}>
        <p className="muted" style={{ marginTop: 0 }}>Nothing here yet. No disasters recorded.</p>
        <Link className="btn" href="/">Browse the saints</Link>
      </div>
    );

  const subtotal = items.reduce((a, i) => a + i.qty * PRICE_CENTS, 0);

  return (
    <>
      <div className="panel" style={{ marginTop: 22 }}>
        {items.map((i) => {
          const s = getSaint(i.slug);
          const g = GARMENTS.find((x) => x.id === i.color);
          if (!s || !g) return null;
          return (
            <div className="line" key={`${i.slug}|${i.color}|${i.size}`}>
              <Image src={mockupSrc(i.slug, i.color)} alt="" width={84} height={84} />
              <div>
                <Link href={`/shirt/${i.slug}`} style={{ textDecoration: "none", fontWeight: 600 }}>
                  {s.plateName} <span style={{ fontWeight: 400 }}>{s.epithet}</span>
                </Link>
                <div className="muted" style={{ fontSize: ".9rem" }}>
                  {g.label} · {SIZE_LABEL[i.size] ?? i.size}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 14, alignItems: "center" }}>
                  <span className="qty">
                    <button aria-label="Decrease" onClick={() => setQty(i, i.qty - 1)}>–</button>
                    <span>{i.qty}</span>
                    <button aria-label="Increase" onClick={() => setQty(i, i.qty + 1)}>+</button>
                  </span>
                  <button onClick={() => remove(i)}
                    style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}
                    className="muted">
                    Remove
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>{money(i.qty * PRICE_CENTS)}</div>
            </div>
          );
        })}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="totals"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="totals muted"><span>Shipping</span><span>Calculated at checkout</span></div>
        <div style={{ marginTop: 18 }}>
          <Link className="btn wide" href="/checkout">Proceed to checkout</Link>
        </div>
      </div>
    </>
  );
}
