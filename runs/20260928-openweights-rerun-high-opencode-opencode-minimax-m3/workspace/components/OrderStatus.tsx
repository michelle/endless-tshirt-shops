"use client";

import { useEffect, useState } from "react";
import type Stripe from "stripe";

interface OrderResponse {
  record: null | {
    key: string;
    stripeSessionId: string;
    design: {
      date: string;
      lat: number;
      lon: number;
      place?: string;
      title: string;
      shirt: { color: string; size: string };
    };
    prodigiOrderId: string | null;
    prodigiOutcome: string | null;
    prodigiIssues: { code: string | null; description: string | null }[];
    amountTotal: number | null;
    currency: string | null;
    createdAt: string;
    updatedAt: string;
  };
  prodigiStatus: { stage?: string; issues?: unknown[] } | string | null;
}

export default function OrderStatus({
  sessionId,
  session,
}: {
  sessionId: string;
  session: Stripe.Checkout.Session | null;
}) {
  const [data, setData] = useState<OrderResponse | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const fetchOnce = async () => {
      try {
        const r = await fetch(`/api/order/${sessionId}`, { cache: "no-store" });
        const j = (await r.json()) as OrderResponse;
        if (!cancelled) {
          setData(j);
          setPollCount(attempts);
        }
      } catch {
        // ignore - retry on next tick
      }
    };

    fetchOnce();
    // Webhook can take a few seconds; poll quickly for the first minute.
    const interval = setInterval(() => {
      attempts += 1;
      fetchOnce();
      if (attempts > 24) clearInterval(interval);
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  return (
    <>
      <section className="card" style={{ marginTop: 24 }}>
        <p className="kicker">Payment</p>
        <dl className="meta" style={{ marginTop: 8 }}>
          <dt>Stripe session</dt>
          <dd style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}>
            {sessionId}
          </dd>
          {session?.amount_total != null && (
            <>
              <dt>Paid</dt>
              <dd>
                {(session.amount_total / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: (session.currency ?? "usd").toUpperCase(),
                })}
              </dd>
            </>
          )}
          {(session as unknown as { payment_intent?: string | null })?.payment_intent && (
            <>
              <dt>PaymentIntent</dt>
              <dd style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}>
                {String((session as unknown as { payment_intent?: string | null }).payment_intent)}
              </dd>
            </>
          )}
          {session?.shipping_details?.address && (
            <>
              <dt>Shipping to</dt>
              <dd>
                {(session.shipping_details?.name ?? "Customer")},{" "}
                {session.shipping_details?.address?.line1},{" "}
                {session.shipping_details?.address?.postal_code}{" "}
                {session.shipping_details?.address?.city},{" "}
                {session.shipping_details?.address?.country}
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <p className="kicker">Print queue</p>
        {!data ? (
          <p style={{ color: "var(--ink-soft)", marginTop: 8 }}>
            Waiting for the webhook…
          </p>
        ) : !data.record ? (
          <p style={{ color: "var(--ink-soft)", marginTop: 8 }}>
            Waiting for the webhook… (poll #{pollCount + 1})
          </p>
        ) : (
          <dl className="meta" style={{ marginTop: 8 }}>
            <dt>Status</dt>
            <dd>{data.record.prodigiOutcome ?? "pending"}</dd>
            {data.record.prodigiOrderId && (
              <>
                <dt>Prodigi order</dt>
                <dd style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}>
                  {data.record.prodigiOrderId}
                </dd>
              </>
            )}
            {typeof data.prodigiStatus === "object" && data.prodigiStatus && "stage" in data.prodigiStatus && (
              <>
                <dt>Prodigi stage</dt>
                <dd>{(data.prodigiStatus as { stage?: string }).stage ?? "unknown"}</dd>
              </>
            )}
            {data.record.prodigiIssues?.length > 0 && (
              <>
                <dt>Issues</dt>
                <dd>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {data.record.prodigiIssues.map((i, ix) => (
                      <li key={ix}>{i.description ?? i.code ?? "unknown"}</li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
            <dt>Design</dt>
            <dd>
              {data.record.design.title} · {data.record.design.date} ·{" "}
              {data.record.design.place ??
                `${data.record.design.lat.toFixed(2)}°, ${data.record.design.lon.toFixed(2)}°`}{" "}
              · {data.record.design.shirt.color}, {data.record.design.shirt.size.toUpperCase()}
            </dd>
          </dl>
        )}
      </section>
    </>
  );
}
