"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DesignPreview } from "./DesignPreview";
import { decodeDesign, formatDateLong, money, type Design } from "@/lib/design";

interface OrderJson {
  id: string;
  paid: boolean;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  email: string | null;
  shipping: { name?: string; address?: { line1?: string; line2?: string | null; city?: string; state?: string | null; postal_code?: string; country?: string } } | null;
  design: string | null;
  summary: string | null;
  quantity: number;
  prodigiOrderId: string | null;
  prodigi: {
    id: string;
    stage: string;
    details: Record<string, string>;
    issues: Array<{ errorCode: string; description: string }>;
    shipments: Array<{ carrier?: string; service?: string; tracking?: string; trackingUrl?: string; status?: string }>;
  } | null;
  fulfillmentError: string | null;
  error?: string;
}

const STEP_LABELS: Array<[string, string, string]> = [
  ["downloadAssets", "Artwork received by the print lab", "Your 300 DPI print file is downloaded and checked."],
  ["printReadyAssetsPrepared", "Print file prepared", "Converted to the lab's print-ready format."],
  ["allocateProductionLocation", "Routed to the nearest facility", "Printed close to you to cut shipping time."],
  ["inProduction", "In production", "Being printed and pressed."],
  ["shipping", "Shipped", "Tracking appears below once the carrier scans it."],
];

export function OrderStatus() {
  const sp = useSearchParams();
  const sessionId = sp.get("session_id");
  const [data, setData] = useState<OrderJson | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    let attempts = 0;
    async function load() {
      try {
        const r = await fetch(`/api/orders/${sessionId}`, { cache: "no-store" });
        const j = (await r.json()) as OrderJson;
        if (!r.ok) throw new Error(j.error ?? "Could not load order");
        if (!stop) setData(j);
        const settled = j.prodigi && (j.prodigi.stage === "Complete" || j.prodigi.stage === "Cancelled");
        if (!stop && !settled && attempts++ < 20) setTimeout(load, j.prodigiOrderId ? 8000 : 3000);
      } catch (e) {
        if (!stop) setErr((e as Error).message);
      }
    }
    load();
    return () => {
      stop = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <p>
        No order reference found. <Link href="/design">Start a design</Link>.
      </p>
    );
  }
  if (err) return <p className="error">{err}</p>;
  if (!data) return <p style={{ color: "var(--muted)" }}>Looking up your order…</p>;

  let design: Design | null = null;
  try {
    design = data.design ? decodeDesign(data.design) : null;
  } catch {
    design = null;
  }
  const details = data.prodigi?.details ?? {};
  const addr = data.shipping?.address;

  return (
    <div className="thanks">
      <div>{design && <DesignPreview design={design} mode="mockup" />}</div>
      <div>
        <div className="eyebrow">{data.paid ? "Order confirmed" : "Payment pending"}</div>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 48px)" }}>
          {data.paid ? "It's on its way to the printer." : "Waiting for payment to settle."}
        </h1>
        <p className="lede">
          {design ? `${design.name || "Your sky"} · ${formatDateLong(design.date)}` : data.summary}
          {data.email ? ` — a receipt has been sent to ${data.email}.` : "."}
        </p>

        <div className="status-list">
          <div className="status-item">
            <span className={`status-dot ${data.paid ? "done" : "active"}`} />
            <div>
              <b>Payment {data.paid ? "received" : data.paymentStatus}</b>
              <span>
                {data.amountTotal != null && data.currency ? money(data.amountTotal, data.currency) : ""} via Stripe
              </span>
            </div>
          </div>
          <div className="status-item">
            <span className={`status-dot ${data.prodigiOrderId ? "done" : data.fulfillmentError ? "error" : data.paid ? "active" : ""}`} />
            <div>
              <b>{data.prodigiOrderId ? "Sent to print lab" : data.fulfillmentError ? "Fulfilment needs attention" : "Sending to print lab"}</b>
              <span>
                {data.prodigiOrderId ? (
                  <>Print order <span className="mono">{data.prodigiOrderId}</span></>
                ) : data.fulfillmentError ? (
                  "We hit a snag handing this to the printer. It will retry automatically; nothing more is needed from you."
                ) : (
                  "Usually takes a few seconds."
                )}
              </span>
            </div>
          </div>
          {data.prodigi &&
            STEP_LABELS.map(([key, label, hint]) => {
              const v = details[key];
              const cls = v === "Complete" ? "done" : v === "InProgress" ? "active" : v === "Error" ? "error" : "";
              return (
                <div className="status-item" key={key}>
                  <span className={`status-dot ${cls}`} />
                  <div>
                    <b>{label}</b>
                    <span>{v === "Complete" ? "Done" : v === "InProgress" ? "In progress" : v === "Error" ? "Error, the lab has been notified" : hint}</span>
                  </div>
                </div>
              );
            })}
          {data.prodigi?.shipments
            .filter((s) => s.tracking)
            .map((s, i) => (
              <div className="status-item" key={i}>
                <span className="status-dot done" />
                <div>
                  <b>
                    {s.carrier} {s.service}
                  </b>
                  <span>
                    Tracking{" "}
                    {s.trackingUrl ? (
                      <a href={s.trackingUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                        {s.tracking}
                      </a>
                    ) : (
                      s.tracking
                    )}
                  </span>
                </div>
              </div>
            ))}
        </div>

        <dl className="kv">
          <dt>Order reference</dt>
          <dd className="mono">{data.id}</dd>
          {data.prodigi && (
            <>
              <dt>Lab status</dt>
              <dd>{data.prodigi.stage}</dd>
            </>
          )}
          {addr && (
            <>
              <dt>Ships to</dt>
              <dd>
                {data.shipping?.name}
                <br />
                {addr.line1}
                {addr.line2 ? <>, {addr.line2}</> : null}
                <br />
                {addr.city}
                {addr.state ? `, ${addr.state}` : ""} {addr.postal_code}, {addr.country}
              </dd>
            </>
          )}
          <dt>Quantity</dt>
          <dd>{data.quantity}</dd>
        </dl>

        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {data.design && (
            <a className="btn btn-ghost" href={`/api/art/${data.design}.png?w=1200&bg=1`} target="_blank" rel="noreferrer">
              Download a wallpaper of your design
            </a>
          )}
          <Link className="btn btn-ghost" href="/design">
            Make another
          </Link>
        </div>
      </div>
    </div>
  );
}
