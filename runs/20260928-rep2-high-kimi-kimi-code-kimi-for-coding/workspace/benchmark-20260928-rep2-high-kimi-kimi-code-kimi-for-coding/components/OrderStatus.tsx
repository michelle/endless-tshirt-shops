"use client";

import { useEffect, useState } from "react";

interface OrderStatusData {
  paid: boolean;
  paymentStatus: string;
  email: string | null;
  design: { color: string; size: string; style: string; ink: string } | null;
  prodigiOrderId: string | null;
  prodigi: {
    id: string;
    stage: string;
    issues: { errorCode?: string; detail?: string }[];
    thumbnailUrl: string | null;
    shipments: {
      id: string;
      status?: string;
      carrier?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      dispatchDate?: string;
    }[];
  } | null;
}

export default function OrderStatus({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<OrderStatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok) throw new Error("bad status");
        const json = (await res.json()) as OrderStatusData;
        if (stopped) return;
        setData(json);
        setError(false);
        attempts += 1;
        const settled = json.paid && json.prodigi;
        if (!settled && attempts < 60) setTimeout(tick, 3000);
      } catch {
        if (!stopped) {
          setError(true);
          attempts += 1;
          if (attempts < 10) setTimeout(tick, 3000);
        }
      }
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [sessionId]);

  return (
    <section className="status-panel card" aria-live="polite">
      <h2 className="section-title" style={{ textAlign: "left", fontSize: "1.4rem" }}>
        Your order
      </h2>
      {error && !data && <p>Couldn&apos;t load the order yet — retrying…</p>}
      {data && (
        <>
          {data.design && (
            <p style={{ marginTop: 0, color: "var(--ink-soft)" }}>
              {data.design.color} tee · size {data.design.size} ·{" "}
              {data.design.style === "fill" ? "mountain fill" : "pulse line"} print
            </p>
          )}
          <div className="status-steps">
            <span className={`pill ${data.paid ? "done" : "active"}`}>
              {data.paid ? "✓ Payment received" : "Confirming payment…"}
            </span>
            <span
              className={`pill ${
                data.prodigiOrderId ? "done" : data.paid ? "active" : ""
              }`}
            >
              {data.prodigiOrderId
                ? "✓ Sent to the print lab"
                : data.paid
                  ? "Rendering your print…"
                  : "Awaiting payment"}
            </span>
            <span className={`pill ${data.prodigi ? "done" : ""}`}>
              {data.prodigi ? `Lab status: ${data.prodigi.stage}` : "Production"}
            </span>
          </div>

          {data.prodigi?.shipments && data.prodigi.shipments.length > 0 && (
            <div className="tracking">
              {data.prodigi.shipments.map((s) => (
                <div key={s.id}>
                  Shipped{ s.carrier ? ` via ${s.carrier}` : ""}
                  {s.trackingNumber && (
                    <>
                      {" "}
                      — tracking:{" "}
                      {s.trackingUrl ? (
                        <a href={s.trackingUrl} target="_blank" rel="noreferrer">
                          {s.trackingNumber}
                        </a>
                      ) : (
                        s.trackingNumber
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.prodigi?.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.prodigi.thumbnailUrl}
              alt="Production preview from the print lab"
              className="status-thumb"
            />
          )}

          {data.prodigi && data.prodigi.issues.length > 0 && (
            <p className="error-note">
              The print lab flagged an issue with this order — please contact us with
              reference {data.prodigi.id}.
            </p>
          )}
          {!data.paid && (
            <p className="fine">
              Payment status: {data.paymentStatus}. If you just paid, give the webhook a
              few seconds to catch up.
            </p>
          )}
        </>
      )}
    </section>
  );
}
