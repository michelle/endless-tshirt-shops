"use client";

import { useEffect, useState } from "react";
import type { OrderView } from "@/lib/fulfill";

type OrderJson = OrderView & { fulfilError: string | null };

const STAGE_COPY: Record<string, string> = {
  InProgress: "Order received by the print lab. Printing and dispatch usually take 2–4 business days.",
  Complete: "Shipped.",
  Cancelled: "Cancelled.",
  OnHold: "On hold at the print lab. We'll sort it out.",
};

export function OrderStatus({ sessionId }: { sessionId: string }) {
  const [order, setOrder] = useState<OrderJson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll(n: number) {
      try {
        const res = await fetch(`/api/order/${sessionId}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        const data = (await res.json()) as OrderJson;
        if (cancelled) return;
        setOrder(data);
        setAttempts(n);
        const done = data.prodigi || data.fulfilError || (data.paymentStatus !== "paid" && data.paymentStatus !== "unpaid");
        if (!done && n < 8) timer = setTimeout(() => poll(n + 1), 2500);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    poll(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (error) return <p className="font-mono text-red-400">Could not load order: {error}</p>;
  if (!order) return <p className="font-mono text-muted animate-pulse">Loading order…</p>;

  const paid = order.paymentStatus === "paid";
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-white/10 p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted mb-3">Payment</h2>
        <p className="font-mono text-lg">{paid ? "✓ Paid" : `Status: ${order.paymentStatus}`}</p>
        {order.amountTotal != null && (
          <p className="text-sm text-muted mt-1">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency ?? "usd" }).format(order.amountTotal / 100)}
            {order.email ? ` · receipt to ${order.email}` : ""}
          </p>
        )}
        {order.spec && (
          <p className="text-sm mt-3">
            {order.spec.quantity} × <b>{order.spec.code} {order.spec.phrase}</b>, {order.spec.style} print, {order.spec.color}, size {order.spec.size.toUpperCase()}
          </p>
        )}
        {order.shipTo && (
          <address className="not-italic text-sm text-muted mt-3 leading-relaxed">
            {order.shipTo.name}<br />
            {order.shipTo.address.line1}{order.shipTo.address.line2 ? <><br />{order.shipTo.address.line2}</> : null}<br />
            {[order.shipTo.address.city, order.shipTo.address.state, order.shipTo.address.postal_code].filter(Boolean).join(", ")}<br />
            {order.shipTo.address.country}
          </address>
        )}
      </section>

      <section className="rounded-xl border border-white/10 p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted mb-3">Print &amp; shipping</h2>
        {order.prodigi ? (
          <>
            <p className="font-mono text-lg">{order.prodigi.stage === "Complete" ? "✓ Shipped" : order.prodigi.stage}</p>
            <p className="text-sm text-muted mt-1">{STAGE_COPY[order.prodigi.stage] ?? ""}</p>
            <p className="font-mono text-xs text-muted mt-3">Prodigi order {order.prodigi.id}</p>
            {order.prodigi.shipments?.map((s) => (
              <p key={s.id} className="text-sm mt-2">
                {s.carrier?.name ?? "Carrier"} {s.carrier?.service ?? ""}{" "}
                {s.tracking?.url ? <a className="underline text-accent" href={s.tracking.url}>{s.tracking.number ?? "track"}</a> : s.tracking?.number}
              </p>
            ))}
            {order.prodigi.issues.length > 0 && (
              <ul className="text-sm text-amber-300 mt-3 list-disc pl-5">
                {order.prodigi.issues.map((i) => <li key={i}>{i}</li>)}
              </ul>
            )}
            {order.prodigi.error && <p className="text-sm text-amber-300 mt-3">{order.prodigi.error}</p>}
          </>
        ) : order.fulfilError ? (
          <p className="text-sm text-amber-300">We could not hand this to the print lab automatically: {order.fulfilError}. We&apos;ll place it manually.</p>
        ) : paid ? (
          <p className="font-mono text-muted animate-pulse">Sending to the print lab… ({attempts})</p>
        ) : (
          <p className="text-sm text-muted">Waiting for payment.</p>
        )}
      </section>
    </div>
  );
}
