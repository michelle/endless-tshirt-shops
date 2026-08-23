"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StatusResponse = {
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentError: string | null;
  orderId: string | null;
};

const MAX_ATTEMPTS = 20;
const POLL_MS = 2000;

export default function OrderStatus({
  paymentIntentId,
}: {
  paymentIntentId: string | null;
}) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentIntentId) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/order-status?payment_intent=${paymentIntentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not fetch order status");
        if (cancelled) return;
        setStatus(data);
        attempts += 1;
        if (data.fulfillmentStatus === "pending" && attempts < MAX_ATTEMPTS) {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentIntentId]);

  if (!paymentIntentId) {
    return (
      <Centered>
        <p className="text-zinc-400">No order found.</p>
        <BackLink />
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <p className="text-rose-400">{error}</p>
        <BackLink />
      </Centered>
    );
  }

  if (!status) {
    return (
      <Centered>
        <p className="text-zinc-400">Loading your order…</p>
      </Centered>
    );
  }

  return (
    <Centered>
      <p className="text-xs tracking-[0.2em] text-teal-400">ORDER CONFIRMED</p>
      <h1 className="text-2xl font-black">This moment is yours.</h1>
      <p className="text-zinc-400">Payment: {describePaymentStatus(status.paymentStatus)}</p>
      <p className="text-zinc-400">{describeFulfillment(status)}</p>
      {status.orderId && (
        <p className="text-xs text-zinc-500">Print order ID: {status.orderId}</p>
      )}
      <BackLink />
    </Centered>
  );
}

function describePaymentStatus(paymentStatus: string): string {
  if (paymentStatus === "succeeded") return "Confirmed";
  return paymentStatus;
}

function describeFulfillment(status: StatusResponse): string {
  if (status.fulfillmentStatus === "ordered") {
    return "Your shirt has been sent to print.";
  }
  if (status.fulfillmentStatus === "error") {
    return `We hit a snag sending this to print${
      status.fulfillmentError ? `: ${status.fulfillmentError}` : ""
    }. Our team has been notified.`;
  }
  return "Sending your shirt to print…";
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className="mt-6 text-xs text-zinc-500 hover:text-zinc-300">
      ← Back to shop
    </Link>
  );
}
