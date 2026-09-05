"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, PackageCheck } from "lucide-react";
type OrderData = {
  status: string;
  paid: boolean;
  testMode: boolean;
  fit: string;
  size: string;
  timestamp: number;
  amount: number;
  reference: string;
  prodigiOrderId: string | null;
  printStage: string | null;
  tracking: Array<{
    number: string | null;
    url: string | null;
    carrier: string | null;
  }>;
  checkoutUrl: string | null;
};
export default function Order() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);
  const credentials = useRef<{ sessionId: string; token: string } | null>(null);
  async function refresh() {
    if (!credentials.current) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials.current),
        signal: AbortSignal.timeout(55000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your order.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const sessionId = q.get("session_id"),
      token = q.get("token");
    if (sessionId && token) {
      credentials.current = { sessionId, token };
      try {
        sessionStorage.setItem(
          "datetime-last-order",
          JSON.stringify(credentials.current),
        );
      } catch {}
    } else {
      try {
        credentials.current = JSON.parse(
          sessionStorage.getItem("datetime-last-order") ?? "null",
        );
      } catch {}
    }
    if (credentials.current) {
      void refresh();
    } else {
      setError(
        "Your private order link is missing. Open the link from your completed checkout in the same browser.",
      );
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (order?.status !== "processing") return;
    const id = setTimeout(() => void refresh(), 10000);
    return () => clearTimeout(id);
  }, [order]);
  async function copyLink() {
    if (!credentials.current) return;
    const url = new URL("/order", location.origin);
    url.searchParams.set("session_id", credentials.current.sessionId);
    url.searchParams.set("token", credentials.current.token);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch {
      setError("Copy the address from your browser to save your order link.");
    }
  }
  const heading = !order
    ? "Finding your moment…"
    : order.status === "refunded"
      ? "Payment refunded."
      : !order.paid
        ? "Your moment is waiting."
        : order.status === "cancelled"
          ? "Order canceled."
          : "This moment is yours.";
  return (
    <>
      <header className="header">
        <a className="brand" href="/">
          datetime<span className="brand-dot">.</span>store
        </a>
        <a className="back-link" href="/">
          <ArrowLeft size={14} /> Back to the store
        </a>
      </header>
      <main className="order-page">
        <span className="eyebrow">A MOMENT, MADE TANGIBLE</span>
        <h1>{error && !order ? "Let’s find your order." : heading}</h1>
        {error && (
          <div className="checkout-error" role="alert">
            {error}
          </div>
        )}
        {order ? (
          <>
            <p className="order-lede">
              {order.status === "refunded"
                ? "Your payment has been refunded. No print order will be submitted."
                : order.paid
                  ? "Your payment is confirmed and your timestamp is saved."
                  : "Payment has not been completed. Your card has not been charged for this checkout."}
            </p>
            {order.testMode && (
              <p className="notice">
                This is a test order. No real payment was taken and no shirt
                will be shipped.
              </p>
            )}
            <div className="order-card">
              <span className="eyebrow">YOUR CAPTURED MOMENT</span>
              <div className="counter">{order.timestamp}</div>
              <p className="order-time">
                {new Date(order.timestamp)
                  .toISOString()
                  .replace("T", " · ")
                  .replace("Z", " UTC")}
              </p>
              <dl className="order-summary">
                <div>
                  <dt>The datetime tee</dt>
                  <dd>
                    {order.fit === "fitted" ? "Fitted" : "Unisex"} /{" "}
                    {order.size} / Black
                  </dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>Free · United States</dd>
                </div>
                <div>
                  <dt>
                    {order.paid ? "Total paid" : "Order total"}
                    {order.testMode ? " (test)" : ""}
                  </dt>
                  <dd>${(order.amount / 100).toFixed(2)} USD</dd>
                </div>
                <div>
                  <dt>Order reference</dt>
                  <dd>{order.reference}</dd>
                </div>
              </dl>
            </div>
            <div className="order-status" role="status">
              {order.status === "submitted" || order.status === "complete" ? (
                <PackageCheck size={20} />
              ) : order.paid ? (
                <CheckCircle2 size={20} />
              ) : (
                <Clock3 size={20} />
              )}
              <strong>
                {
                  (
                    {
                      submitted: order.testMode
                        ? "Accepted by Prodigi sandbox"
                        : "Accepted by our print partner",
                      complete: order.testMode
                        ? "Sandbox order completed"
                        : "Order completed",
                      processing:
                        "Payment confirmed · sending to print partner",
                      needs_attention:
                        "Payment confirmed · order needs attention",
                      unpaid: "Awaiting payment",
                      expired: "This checkout has expired",
                      cancelled: "Print order canceled",
                      refunded: "Payment refunded · no print order submitted",
                    } as Record<string, string>
                  )[order.status]
                }
              </strong>
            </div>
            <p className="private-note">
              {order.status === "processing"
                ? "Your payment is safe. Fulfillment is pending, and we will retry automatically. You do not need to pay again."
                : order.status === "needs_attention"
                  ? "The print partner flagged an issue. Keep this order reference; the store owner can review it in Prodigi. You do not need to pay again."
                  : order.status === "submitted"
                    ? "Your exact timestamp and shirt selection have been sent to the print partner."
                    : order.status === "expired"
                      ? "Return to the store to capture a new moment."
                      : "Save this private order link to check progress later."}
            </p>
            {order.tracking.map((t, i) => (
              <p key={i} className="private-note">
                {t.carrier}{" "}
                {t.url ? (
                  <a href={t.url} target="_blank" rel="noreferrer">
                    Track shipment {t.number} ↗
                  </a>
                ) : (
                  t.number
                )}
              </p>
            ))}
            {order.checkoutUrl && (
              <a className="checkout" href={order.checkoutUrl}>
                Continue to secure checkout
              </a>
            )}
          </>
        ) : (
          busy && (
            <p role="status" className="order-lede">
              Checking your payment and print order…
            </p>
          )
        )}
        <div className="order-actions">
          {credentials.current && (
            <>
              <button disabled={busy} onClick={() => void refresh()}>
                {busy ? "Refreshing…" : "Refresh order"}
              </button>
              <button onClick={() => void copyLink()}>
                {copied ? "Link copied ✓" : "Save order link"}
              </button>
            </>
          )}
          <a href="/">Capture another moment ↗</a>
        </div>
        <p className="private-note">
          Your order link is private. Only share it with someone you trust.
        </p>
      </main>
    </>
  );
}
