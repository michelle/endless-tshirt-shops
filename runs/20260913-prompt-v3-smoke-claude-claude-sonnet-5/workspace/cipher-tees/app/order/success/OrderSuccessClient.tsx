"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartStore";
import OrderSummary from "@/components/OrderSummary";
import type { OrderStatusResponse } from "@/lib/orderMeta";

const MAX_POLL_ATTEMPTS = 6;

export default function OrderSuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { clear } = useCart();
  const [status, setStatus] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    clear();
    // Empty the local cart once — this page only renders after a real
    // Stripe redirect back from a completed Checkout Session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId!)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load order");
          return;
        }
        setStatus(data);
        if (!data.prodigiOrderId && !data.fulfillmentError && attemptsRef.current < MAX_POLL_ATTEMPTS) {
          attemptsRef.current += 1;
          timer = setTimeout(poll, 3000);
        }
      } catch {
        if (!cancelled) setError("Could not load order");
      }
    }
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="container">
        <h1>No order reference found</h1>
        <Link href="/design">Build a tee</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Something went wrong</h1>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="container">
        <h1>Loading your order…</h1>
      </div>
    );
  }

  return (
    <div className="container order-success">
      <h1>Thank you — it&rsquo;s in production.</h1>
      <p className="muted">
        Order reference: <code>{sessionId}</code> — save this page&rsquo;s URL, it&rsquo;s how you
        check status later.
      </p>

      <OrderSummary status={status} />

      <p className="muted small">
        You can also look up this order anytime at <Link href="/order/status">order status</Link>{" "}
        using the reference above.
      </p>
    </div>
  );
}
