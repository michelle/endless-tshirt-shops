"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface OrderStatus {
  payment_status: string;
  fulfillment_status: string;
  order_id: string | null;
  error: string | null;
  timestamp: number | null;
}

export default function SuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/order-status?session_id=${sessionId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setPollError(data.error || "Could not look up order.");
          return;
        }
        setStatus(data);
        attempts.current += 1;
        if (data.fulfillment_status === "processing" && attempts.current < 20) {
          setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setPollError("Could not reach the server.");
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return <p className="text-neutral-600">Missing session id.</p>;
  }

  if (pollError) {
    return <p className="text-red-600">{pollError}</p>;
  }

  if (!status) {
    return <p className="text-neutral-500">Loading your order…</p>;
  }

  return (
    <div className="max-w-md text-center">
      {status.fulfillment_status === "fulfilled" && (
        <>
          <p className="text-xl font-medium mb-3">Congrats on your pretty cool shirt! 🎉</p>
          <p className="text-neutral-600 mb-1">
            Printed with the moment: <span className="font-mono">{status.timestamp}</span>
          </p>
          <p className="text-neutral-600 mb-4">
            Order <span className="font-mono">{status.order_id}</span> is on its way through
            Scalable Press production. You'll receive an email confirmation shortly.
          </p>
          <a href="/" className="inline-block mt-2 underline text-[#337ab7]">
            Get another shirt
          </a>
        </>
      )}

      {(status.fulfillment_status === "processing") && (
        <>
          <p className="text-xl font-medium mb-3">Payment received — printing your shirt…</p>
          <p className="text-neutral-600">
            We're placing your order with our print partner. This page updates automatically.
          </p>
        </>
      )}

      {(status.fulfillment_status === "failed" || status.fulfillment_status === "refunded") && (
        <>
          <p className="text-xl font-medium mb-3">We couldn't fulfill this order</p>
          <p className="text-neutral-600 mb-1">{status.error}</p>
          <p className="text-neutral-600 mb-4">
            {status.fulfillment_status === "refunded"
              ? "You have been refunded automatically."
              : "Please contact support — your card may have been charged."}
          </p>
          <a href="/" className="inline-block mt-2 underline text-[#337ab7]">
            Back to datetime.store
          </a>
        </>
      )}
    </div>
  );
}
