"use client";

import { useEffect, useRef, useState } from "react";
import type { Design } from "@/lib/design";
import { epithetFor } from "@/lib/design";
import { colorById, formatUsd, sizeById } from "@/lib/catalog";
import { Specimen } from "./Specimen";
import { useCart } from "./cart-store";

type Summary = {
  id: string;
  paid: boolean;
  status: string;
  email: string | null;
  shipTo: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  shippingLabel: string;
  items: { design: Design; quantity: number; amount: number }[];
  prodigiOrderId: string | null;
  prodigi: {
    status?: { stage: string; details?: Record<string, string> };
    shipments?: { carrier?: { name: string; service: string }; tracking?: { number?: string; url?: string } }[];
  } | null;
};

export function OrderStatus({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const { clear } = useCart();
  const cleared = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing order reference.");
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async (n: number) => {
      try {
        const res = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Order not found");
        if (stop) return;
        setData(json);
        setPolls(n);
        if (json.paid && !cleared.current) {
          cleared.current = true;
          clear();
        }
        // Poll quickly until the print order exists, then slowly for production status.
        const delay = json.prodigiOrderId ? 30000 : n < 40 ? 3000 : 10000;
        timer = setTimeout(() => tick(n + 1), delay);
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
    };
    tick(0);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [sessionId, clear]);

  if (error) {
    return (
      <div className="empty">
        <h1 className="page-title">We couldn&apos;t find that order</h1>
        <p>{error}</p>
        <a className="btn" href="/">
          Back to the collection
        </a>
      </div>
    );
  }
  if (!data) return <h1 className="page-title">Looking up your order…</h1>;

  const details = data.prodigi?.status?.details ?? {};
  const inProd = details.inProduction === "Complete" || details.inProduction === "InProgress";
  const shipped = details.shipping === "Complete";
  const tracking = data.prodigi?.shipments?.find((s) => s.tracking?.url || s.tracking?.number);
  const steps = [
    {
      done: data.paid,
      title: data.paid ? "Payment received" : "Waiting for payment confirmation",
      note: data.paid ? `Confirmation sent to ${data.email ?? "your email"}.` : "This usually takes a few seconds.",
    },
    {
      done: !!data.prodigiOrderId,
      title: data.prodigiOrderId ? "Print files sent to the lab" : "Generating your print files",
      note: data.prodigiOrderId
        ? `Print lab order ${data.prodigiOrderId}${data.prodigi?.status?.stage ? ` · ${data.prodigi.status.stage}` : ""}`
        : data.paid
          ? polls > 30
            ? "Taking longer than usual. We'll keep trying automatically; you can safely close this page."
            : "Rendering each specimen at 4680 × 5790 px…"
          : "Starts right after payment.",
    },
    { done: inProd, title: "Printing", note: "Direct-to-garment, usually 2–4 business days." },
    {
      done: shipped,
      title: "Shipped",
      note: tracking ? `${tracking.carrier?.name ?? "Carrier"} ${tracking.tracking?.number ?? ""}` : `To ${data.shipTo ?? "you"}.`,
      link: tracking?.tracking?.url,
    },
  ];
  const firstPending = steps.findIndex((s) => !s.done);

  return (
    <>
      <div className="label" style={{ marginTop: 36 }}>
        Order · {data.id.slice(-10).toUpperCase()}
      </div>
      <h1 className="page-title" style={{ marginTop: 6 }}>
        {data.paid ? "Thank you. Your specimens are being preserved." : "Almost there…"}
      </h1>
      <ol className="timeline">
        {steps.map((s, i) => (
          <li key={i} className={s.done ? "done" : i === firstPending && data.paid ? "active" : ""}>
            <span className="dot">{s.done ? "✓" : i + 1}</span>
            <div>
              <b>{s.title}</b>
              <small>
                {s.note}{" "}
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer">
                    Track package
                  </a>
                )}
              </small>
            </div>
          </li>
        ))}
      </ol>
      <div className="order-items">
        {data.items.map((it, i) => (
          <figure key={i}>
            <Specimen design={it.design} />
            <figcaption>
              <i>
                {it.design.genus} {epithetFor(it.design.genus, it.design.trait)}
              </i>
              <div className="mono" style={{ color: "var(--muted)" }}>
                {colorById(it.design.color)?.label} · {sizeById(it.design.size)?.label} · ×{it.quantity} · {formatUsd(it.amount)}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="summary" style={{ position: "static", marginTop: 24, maxWidth: 420 }}>
        <div className="line">
          <span>Subtotal</span>
          <span>{formatUsd(data.subtotal)}</span>
        </div>
        <div className="line">
          <span>{data.shippingLabel}</span>
          <span>{formatUsd(data.shipping)}</span>
        </div>
        <div className="line total">
          <span>Total paid</span>
          <span>{formatUsd(data.total)}</span>
        </div>
      </div>
    </>
  );
}
