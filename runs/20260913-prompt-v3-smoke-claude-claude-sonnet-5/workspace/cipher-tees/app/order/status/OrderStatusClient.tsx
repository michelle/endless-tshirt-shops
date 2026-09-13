"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import OrderSummary from "@/components/OrderSummary";
import type { OrderStatusResponse } from "@/lib/orderMeta";

export default function OrderStatusClient() {
  const params = useSearchParams();
  const [sessionId, setSessionId] = useState(params.get("session_id") ?? "");
  const [status, setStatus] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(id.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Order not found");
        return;
      }
      setStatus(data);
    } catch {
      setError("Could not look up that order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container order-status-page">
      <h1>Order status</h1>
      <p className="muted">
        Paste the order reference (Checkout Session ID) from your confirmation page or receipt.
      </p>
      <form
        className="lookup-form"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(sessionId);
        }}
      >
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="cs_test_..."
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Looking up…" : "Check status"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {status && <OrderSummary status={status} />}
    </div>
  );
}
