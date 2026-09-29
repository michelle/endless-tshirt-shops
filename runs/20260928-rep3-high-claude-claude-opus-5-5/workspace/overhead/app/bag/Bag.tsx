"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MAX_QTY_PER_LINE, PRODUCT, SHIPPING, SIZES, Size, colorByKey, formatMoney } from "@/lib/catalog";
import { CartItem, cart, useCart } from "@/lib/cart";
import { INKS, formatMomentDate, formatMomentTime } from "@/lib/design";
import { renderMockupSVG } from "@/lib/render";

function Line({ item }: { item: CartItem }) {
  const svg = useMemo(() => renderMockupSVG(item.design, `bag-${item.id.slice(0, 8)}`), [item.design, item.id]);
  const d = item.design;
  return (
    <div className="line">
      <div className="thumb" dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <h3>{d.title || "Untitled sky"}</h3>
        <p className="meta">
          {d.place || "Custom location"} · {formatMomentDate(d.date)}, {formatMomentTime(d.time)}
          <br />
          {colorByKey(d.color).label} · {INKS.find((i) => i.key === d.ink)?.label} ink · {formatMoney(PRODUCT.priceCents)} each
        </p>
        <div className="line-actions">
          <label>
            <span className="muted" style={{ fontSize: 13, marginRight: 6 }}>Size</span>
            <select className="select" value={item.size} onChange={(e) => cart.update(item.id, { size: e.target.value as Size })}>
              {SIZES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </label>
          <label>
            <span className="muted" style={{ fontSize: 13, marginRight: 6 }}>Qty</span>
            <select className="select" value={item.qty} onChange={(e) => cart.update(item.id, { qty: Number(e.target.value) })}>
              {Array.from({ length: MAX_QTY_PER_LINE }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <Link href={`/design?edit=${item.id}`} className="link-btn">Edit design</Link>
          <button type="button" className="link-btn" onClick={() => cart.remove(item.id)}>Remove</button>
        </div>
      </div>
    </div>
  );
}

export default function Bag() {
  const items = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canceled = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("canceled");

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = count * PRODUCT.priceCents;

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ design: i.design, size: i.size, qty: i.qty })) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="wrap empty">
        <p className="eyebrow">Your bag</p>
        <h1>Nothing here yet.</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Every sky starts with a moment.</p>
        <Link href="/design" className="btn btn-gold">Design your sky</Link>
      </div>
    );
  }

  return (
    <div className="wrap bag">
      <div>
        <p className="eyebrow">Your bag</p>
        <h1 style={{ fontSize: 52 }}>{count} {count === 1 ? "sky" : "skies"}, ready to print</h1>
        {canceled && <div className="notice err" style={{ marginBottom: 18 }}>Checkout was cancelled, and you haven&rsquo;t been charged. Your designs are still here.</div>}
        {items.map((item) => <Line key={item.id} item={item} />)}
        <Link href="/design" className="link-btn">+ Design another shirt</Link>
      </div>
      <aside className="panel summary">
        <h2>Summary</h2>
        <div className="sum-row"><span>Subtotal ({count} {count === 1 ? "tee" : "tees"})</span><span>{formatMoney(subtotal)}</span></div>
        <div className="sum-row"><span>{SHIPPING.label}</span><span>{formatMoney(SHIPPING.amountCents)}</span></div>
        <div className="sum-row total"><span>Total</span><span>{formatMoney(subtotal + SHIPPING.amountCents)}</span></div>
        <p className="muted" style={{ fontSize: 13 }}>Prices in USD. Any applicable taxes are shown at checkout. Printed on demand; arrives in {SHIPPING.minDays}–{SHIPPING.maxDays} business days.</p>
        <button type="button" className="btn btn-gold btn-block" onClick={checkout} disabled={busy}>
          {busy ? "Opening secure checkout…" : "Check out securely"}
        </button>
        {error && <div className="notice err">{error}</div>}
        {process.env.NEXT_PUBLIC_TEST_MODE === "1" && (
          <div className="test-card">
            <b>Test mode:</b> pay with card <code>4242 4242 4242 4242</code>, any future expiry, any CVC. No real charge is made.
          </div>
        )}
      </aside>
    </div>
  );
}
