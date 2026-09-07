"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/catalog";

type OrderView = {
  id: string;
  reference: string | null;
  created: string;
  stage: string;
  details: Record<string, string>;
  issues: string[];
  shippingMethod: string;
  recipient: { name: string; line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string };
  items: { name: string; color: string; size: string; copies: number; status?: string }[];
  shipments: { carrier?: string; service?: string; trackingNumber?: string; trackingUrl?: string; dispatchDate?: string }[];
  totals: { subtotalCents?: number; shippingCents?: number; totalCents?: number; payment?: string };
  sandbox: boolean;
};

const STEPS: { key: string; label: string }[] = [
  { key: "downloadAssets", label: "Artwork received" },
  { key: "printReadyAssetsPrepared", label: "Print files prepared" },
  { key: "allocateProductionLocation", label: "Assigned to a print lab" },
  { key: "inProduction", label: "Printing" },
  { key: "shipping", label: "Shipped" },
];

export function OrderStatus({ id, token, clearCart }: { id: string; token: string; clearCart?: boolean }) {
  const cart = useCart();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clearCart && cart.ready) cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCart, cart.ready]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(`/api/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not load the order");
        if (cancelled) return;
        setOrder(j.order);
        setError(null);
        if (j.order.stage === "InProgress") timer = setTimeout(poll, 8000);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, token]);

  if (error) return <div className="error">{error}</div>;
  if (!order) return <p className="muted">Loading your order…</p>;

  const stageLabel: Record<string, string> = { InProgress: "In progress", Complete: "Complete", Cancelled: "Cancelled", Draft: "Draft", AwaitingPayment: "Awaiting payment" };
  const r = order.recipient;

  return (
    <div className="order">
      <div className="order-head">
        <div className="eyebrow">Order {order.reference ?? order.id}</div>
        <h1>Thanks, {r.name.split(" ")[0]}. Your permit is approved.</h1>
        <p className="muted">
          Placed {new Date(order.created).toLocaleString()} · Status: <strong>{stageLabel[order.stage] ?? order.stage}</strong>
          {order.sandbox && " · sandbox order (nothing will be printed)"}
        </p>
      </div>

      <ol className="timeline">
        {STEPS.map((s) => {
          const st = order.details[s.key] ?? "NotStarted";
          const cls = st === "Complete" ? "done" : st === "InProgress" ? "active" : st === "Error" ? "error" : "";
          return (
            <li key={s.key} className={cls}>
              <span className="dot" />
              <span>{s.label}</span>
              <span className="muted small">{st === "NotStarted" ? "" : st.replace(/([A-Z])/g, " $1").trim()}</span>
            </li>
          );
        })}
      </ol>
      {order.issues.length > 0 && (
        <div className="notice">
          {order.issues.map((i, n) => (
            <div key={n}>{i}</div>
          ))}
        </div>
      )}
      {order.shipments.length > 0 && (
        <div className="shipments">
          <h2>Shipments</h2>
          {order.shipments.map((s, i) => (
            <div key={i} className="shipment">
              {s.carrier ?? "Carrier"} {s.service ? `· ${s.service}` : ""}{" "}
              {s.trackingUrl ? (
                <a href={s.trackingUrl} target="_blank" rel="noreferrer">
                  Track {s.trackingNumber ?? "package"}
                </a>
              ) : s.trackingNumber ? (
                <span>Tracking {s.trackingNumber}</span>
              ) : null}
              {s.dispatchDate && <span className="muted"> · dispatched {new Date(s.dispatchDate).toLocaleDateString()}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="order-cols">
        <div>
          <h2>Items</h2>
          <ul className="plain">
            {order.items.map((it, i) => (
              <li key={i}>
                {it.copies} × {it.name} <span className="muted">({it.color}, {it.size.toUpperCase()})</span>
              </li>
            ))}
          </ul>
          {order.totals.totalCents !== undefined && (
            <div className="totals">
              <div className="row">
                <span>Subtotal</span>
                <span>{formatMoney(order.totals.subtotalCents ?? 0)}</span>
              </div>
              <div className="row">
                <span>Shipping ({order.shippingMethod})</span>
                <span>{formatMoney(order.totals.shippingCents ?? 0)}</span>
              </div>
              <div className="row total">
                <span>Total {order.totals.payment === "sandbox" ? "(not charged)" : "paid"}</span>
                <strong>{formatMoney(order.totals.totalCents)}</strong>
              </div>
            </div>
          )}
        </div>
        <div>
          <h2>Shipping to</h2>
          <address>
            {r.name}
            <br />
            {r.line1}
            {r.line2 && (
              <>
                <br />
                {r.line2}
              </>
            )}
            <br />
            {r.city}
            {r.state ? `, ${r.state}` : ""} {r.postalCode}
            <br />
            {r.country}
          </address>
        </div>
      </div>
      <p className="small muted">
        Bookmark this page to check progress; it refreshes on its own while the order is in progress. <Link href="/">Back to the parks →</Link>
      </p>
    </div>
  );
}
