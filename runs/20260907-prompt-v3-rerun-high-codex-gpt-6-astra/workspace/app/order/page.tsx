"use client";
import { useEffect, useState } from "react";
import { Check, Compass, ArrowLeft, RefreshCw } from "lucide-react";
type Order = {
  paid: boolean;
  status: string;
  orderId?: string;
  test: boolean;
  design?: { place: string; name: string; size: string };
  printStatus?: { stage: string };
  error?: string;
};
export default function OrderPage() {
  const [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const id = new URLSearchParams(location.search).get("session_id");
      if (!id)
        throw new Error(
          "This link is missing its order reference. Open the confirmation link from checkout.",
        );
      const r = await fetch("/api/order?session_id=" + encodeURIComponent(id));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setOrder(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  return (
    <main className="order-page">
      <a className="brand" href="/">
        <Compass />
        <span>
          FIELD NOTES<small>CLUB</small>
        </span>
      </a>
      <div className="order-card">
        <span className="order-icon">
          {order?.paid ? <Check /> : <Compass />}
        </span>
        <div className="eyebrow">YOUR PERSONAL PARK</div>
        <h1>
          {order?.paid
            ? "A story worth wearing."
            : loading
              ? "Checking your order…"
              : "Your order status"}
        </h1>
        {order?.paid && (
          <>
            <p>
              Payment confirmed. Your personal park tee has been sent to our
              print partner.
            </p>
            {order.test && (
              <p className="test-note">
                TEST ORDER · No real payment, printing, or shipping.
              </p>
            )}
            <div className="order-facts">
              <p>
                <span>Your park</span>
                <b>{order.design?.place}</b>
              </p>
              <p>
                <span>Your people</span>
                <b>{order.design?.name}</b>
              </p>
              <p>
                <span>Your tee</span>
                <b>White / {order.design?.size.toUpperCase()}</b>
              </p>
              <p>
                <span>Total</span>
                <b>$44.00 USD</b>
              </p>
              <p>
                <span>Print status</span>
                <b>{order.printStatus?.stage || order.status}</b>
              </p>
              <p>
                <span>Order reference</span>
                <b>{order.orderId}</b>
              </p>
            </div>
            <p className="secure">
              Save this private link to check your order again.
            </p>
          </>
        )}
        {order && !order.paid && (
          <p>
            Payment has not succeeded. Your shirt has not been sent for
            printing.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} />
          {loading ? "Refreshing…" : "Refresh status"}
        </button>
        <a className="back-link" href="/#studio">
          <ArrowLeft size={15} /> Back to the store
        </a>
      </div>
    </main>
  );
}
