"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { readableMoment, COLORS } from "@/lib/catalog";
type Order = {
  paid: boolean;
  testMode: boolean;
  timestamp: number;
  color: string;
  size: string;
  fit: string;
  amount: number;
  orderId: string | null;
  stage: string;
  trackingUrl?: string;
};
export default function Receipt() {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const id = new URLSearchParams(location.search).get("session_id");
    if (!id) {
      setError(
        "This receipt needs an order link. Return to the store to find your moment.",
      );
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/orders?session_id=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder(data);
      setError("");
      if (data.paid)
        try {
          localStorage.removeItem("datetime-bag");
        } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this receipt.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    let count = 0;
    const t = setInterval(() => {
      if (++count <= 12) load();
      else clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);
  const sent = order?.orderId;
  return (
    <main className="success-page">
      <a className="wordmark" href="/">
        datetime<span className="wordmark-dot">.</span>store
      </a>
      <div className="success-icon">
        {loading ? (
          <LoaderCircle className="spin" size={35} />
        ) : order?.paid ? (
          <Check size={35} strokeWidth={1.4} />
        ) : (
          <Clock3 size={35} strokeWidth={1.4} />
        )}
      </div>
      <p className="eyebrow">
        {order?.testMode ? "A SUCCESSFUL LITTLE TEST" : "A LITTLE TIME CAPSULE"}
      </p>
      <h1>
        {order?.paid ? (
          <>
            This moment is <em>yours.</em>
          </>
        ) : loading ? (
          "Finding your moment…"
        ) : (
          "Your moment is waiting."
        )}
      </h1>
      {order?.paid && (
        <>
          <p className="dialog-description">
            You were here. And now you have the tee to prove it.
          </p>
          <div className="bag-moment">
            <span className="eyebrow">CAPTURED, DOWN TO THE MILLISECOND</span>
            <strong>{order.timestamp}</strong>
            <span>{readableMoment(order.timestamp)}</span>
          </div>
          <div className="status-summary">
            <span>
              {COLORS.find((c) => c.id === order.color)?.name} · {order.fit} ·{" "}
              {order.size}
            </span>
            <b>${(order.amount / 100).toFixed(2)} USD</b>
          </div>
          <div className="order-status">
            <h2>
              {order.stage === "needs_review"
                ? "Your print order needs a review"
                : sent
                  ? "Your moment reached the print studio"
                  : "Payment received. Preparing your print order."}
            </h2>
            <p>
              {order.testMode
                ? "This is a Stripe test payment and a Prodigi sandbox order. No real money was charged, and no tee will be printed or shipped."
                : "Your tee will be made just for you. Allow approximately 7–14 business days for printing and delivery."}
            </p>
            {(!sent || order.stage === "needs_review") && (
              <p>
                Payment and printing are separate steps. Keep this receipt link;
                the status updates as the print service processes your order.
              </p>
            )}
          </div>
          {sent && (
            <p className="order-reference">Print order: {order.orderId}</p>
          )}
          {order.trackingUrl && (
            <a
              className="underlined-link"
              href={order.trackingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Track your tee <ArrowUpRight size={17} />
            </a>
          )}
        </>
      )}
      {order && !order.paid && (
        <p className="dialog-description">
          Payment hasn’t completed, so no print order has been placed.
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <button
        className="text-button"
        onClick={() => {
          setLoading(true);
          load();
        }}
      >
        <RefreshCw size={13} /> Refresh order status
      </button>
      <a href="/" className="capture-button">
        There’s always another moment <ArrowUpRight size={19} />
      </a>
      <p className="success-footer">
        Keep this page’s link as your receipt.{" "}
        <a href="/policies">Store policies</a>
      </p>
    </main>
  );
}
