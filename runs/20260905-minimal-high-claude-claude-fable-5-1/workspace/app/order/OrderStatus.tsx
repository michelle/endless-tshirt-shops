"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Status {
  paymentIntentId: string;
  paymentStatus: string;
  style: string | null;
  size: string | null;
  timestamp: number | null;
  artworkUrl: string | null;
  prodigiOrderId: string | null;
  prodigi: { stage: string; issues: { description: string }[]; shipments: { carrier?: { name: string; service: string }; tracking?: { number: string; url: string }; status: string }[] } | null;
  fulfillmentError: string | null;
}

/**
 * Landing page for Stripe's return_url (redirect-based payment methods) and a
 * permanent status page for any order. It first asks the server to place the
 * print order (idempotent), then shows the combined Stripe + Prodigi status.
 */
export default function OrderStatus() {
  const params = useSearchParams();
  const id = params.get("payment_intent");
  const redirectStatus = params.get("redirect_status");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        await fetch("/api/orders/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: id }),
        }).catch(() => undefined);
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error?.message || "Could not load order");
        if (!cancelled) setStatus(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load order");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <p>No order specified. <a href="/">Buy a shirt?</a></p>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!status) return <p>Checking on your order…</p>;

  const paid = status.paymentStatus === "succeeded";
  return (
    <div className="Checkout-success">
      {paid ? (
        <p className="Checkout-success-title">Congrats on your pretty cool shirt!</p>
      ) : (
        <p className="Checkout-success-title">Payment {redirectStatus || status.paymentStatus}</p>
      )}
      {status.timestamp ? (
        <>
          <p>Your shirt says</p>
          <div className="stamp">{status.timestamp}</div>
          <p>which is {new Date(status.timestamp).toLocaleString()}.</p>
        </>
      ) : null}
      {!paid ? <div className="alert alert-warning">This payment has not completed. <a href="/">Try again.</a></div> : null}
      {paid && status.fulfillmentError && !status.prodigiOrderId ? (
        <div className="alert alert-warning">Payment received, but the print order is still being placed: {status.fulfillmentError}</div>
      ) : null}
      <dl>
        <dt>Order</dt>
        <dd>{status.paymentIntentId}</dd>
        <dt>Payment</dt>
        <dd>{status.paymentStatus}</dd>
        {status.style && status.size ? (
          <>
            <dt>Shirt</dt>
            <dd>
              {status.style.charAt(0).toUpperCase() + status.style.slice(1)}, size {status.size}
            </dd>
          </>
        ) : null}
        {status.prodigiOrderId ? (
          <>
            <dt>Print order</dt>
            <dd>{status.prodigiOrderId}</dd>
          </>
        ) : null}
        {status.prodigi ? (
          <>
            <dt>Print status</dt>
            <dd>{status.prodigi.stage}</dd>
          </>
        ) : null}
        {status.prodigi?.shipments?.map((s, i) =>
          s.tracking ? (
            <div key={i} style={{ display: "contents" }}>
              <dt>Tracking</dt>
              <dd>
                <a href={s.tracking.url}>{s.tracking.number}</a> {s.carrier ? `(${s.carrier.name})` : ""}
              </dd>
            </div>
          ) : null,
        )}
        {status.artworkUrl ? (
          <>
            <dt>Artwork</dt>
            <dd>
              <a href={status.artworkUrl}>print file</a>
            </dd>
          </>
        ) : null}
      </dl>
      <p style={{ marginTop: 28 }}>
        <a href="/">♥ Get another shirt</a>
      </p>
    </div>
  );
}
