"use client";

import { useEffect, useState } from "react";
import type { OrderView } from "@/lib/orders";
import { SHIRT_COLORS } from "@/lib/design";
import { ShirtMockup } from "./ShirtMockup";

const STATUS_COPY: Record<OrderView["status"], { title: string; body: string; step: number }> = {
  unpaid: { title: "Payment pending", body: "We have not received your payment yet. If you closed the checkout, you can go back and try again.", step: 0 },
  paid_pending_print: { title: "Payment received", body: "Thank you! We are handing your design to the print shop now. This page updates automatically.", step: 1 },
  sent_to_print: { title: "Sent to the printer", body: "Your shirt is in the print queue. Printing usually takes 2–5 business days.", step: 2 },
  in_production: { title: "Being printed", body: "Ink is going on the shirt. You will get tracking details once it ships.", step: 2 },
  shipped: { title: "Shipped", body: "Your shirt is on its way.", step: 3 },
  cancelled: { title: "Cancelled", body: "This order was cancelled at the print shop. Please contact us so we can sort it out.", step: 0 },
};

function money(cents: number | null, currency: string | null) {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: (currency ?? "usd").toUpperCase() });
}

export function OrderStatus({ initial }: { initial: OrderView }) {
  const [order, setOrder] = useState(initial);

  // Poll while we are waiting on the printer to pick up the job.
  useEffect(() => {
    if (order.status !== "paid_pending_print" && order.status !== "unpaid") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
        if (res.ok) setOrder((await res.json()) as OrderView);
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [order.id, order.status]);

  const copy = STATUS_COPY[order.status];
  const color = order.design ? SHIRT_COLORS.find((c) => c.key === order.design!.color)?.label : null;
  const steps = ["Paid", "Sent to printer", "Printing", "Shipped"];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Order {order.id.slice(-8).toUpperCase()}</p>
          <h1 className="font-display mt-2 text-4xl">{copy.title}</h1>
          <p className="mt-3 max-w-xl text-muted">{copy.body}</p>
          {order.email && <p className="mt-2 text-sm text-muted">A receipt was emailed to {order.email}.</p>}
        </div>

        <ol className="flex flex-wrap gap-2 text-xs">
          {steps.map((s, i) => {
            const done = order.status !== "cancelled" && i < copy.step;
            const active = order.status !== "cancelled" && i === copy.step - 1;
            return (
              <li
                key={s}
                className={`rounded-full border px-3 py-1 ${done || active ? "border-gold/60 text-fg" : "border-line text-muted"} ${active ? "bg-gold/10" : ""}`}
              >
                {done ? "✓ " : ""}
                {s}
              </li>
            );
          })}
        </ol>

        <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          {order.design && (
            <div>
              <dt className="label">Design</dt>
              <dd>
                “{order.design.title || "Under these stars"}”{order.design.subtitle ? ` · ${order.design.subtitle}` : ""}
                <br />
                <span className="text-muted">
                  {order.design.place} · {order.design.date} {order.design.time}
                </span>
              </dd>
            </div>
          )}
          {order.design && (
            <div>
              <dt className="label">Shirt</dt>
              <dd>
                {order.quantity} × {color} · {order.design.size.toUpperCase()} · {money(order.amountTotal, order.currency)} total
              </dd>
            </div>
          )}
          {order.shippingAddress && (
            <div>
              <dt className="label">Ships to</dt>
              <dd className="text-muted">
                {order.shippingName}
                <br />
                {[order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postal_code, order.shippingAddress.country]
                  .filter(Boolean)
                  .join(", ")}
                {order.shippingMethod ? <><br />{order.shippingMethod}</> : null}
              </dd>
            </div>
          )}
          {order.prodigi && (
            <div>
              <dt className="label">Print shop</dt>
              <dd className="text-muted">
                Job {order.prodigi.id} · {order.prodigi.stage}
                {order.sandbox ? " (sandbox: no shirt will actually ship)" : ""}
                {order.prodigi.tracking.filter((t) => t.number).map((t, i) => (
                  <div key={i}>
                    {t.carrier}: {t.url ? <a className="underline" href={t.url} target="_blank" rel="noreferrer">{t.number}</a> : t.number}
                  </div>
                ))}
                {order.prodigi.issues.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-amber-300">
                    {order.prodigi.issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {order.design && (
        <div className="rounded-xl border border-line bg-gradient-to-b from-white/[0.04] to-transparent p-6">
          <ShirtMockup design={order.design} id="order" className="mx-auto w-full max-w-[420px]" />
          <p className="mt-3 text-center text-xs text-muted">What we are printing.</p>
        </div>
      )}
    </div>
  );
}
